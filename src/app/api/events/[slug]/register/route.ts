import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RegistrationSchema } from "@/lib/validation/registration";
import {
  VolunteerRegistrationSchema,
  type VolunteerFormData,
} from "@/lib/validation/volunteer-registration";
import { isRegistrationOpen, isPreRegistration, VOLUNTEER_CALL_SLUG } from "@/lib/events";
import type { Event, Prisma } from "@prisma/client";

type EventForRegistration = Pick<
  Event,
  "id" | "title" | "status" | "autoLiveAt" | "autoCloseAt" | "registrationOpen" | "maxRegistrations"
>;

/** Shared lookup + open/capacity checks. Returns an error response, or the event. */
async function resolveOpenEvent(
  slug: string
): Promise<{ event: EventForRegistration } | { error: NextResponse }> {
  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      status: true,
      autoLiveAt: true,
      autoCloseAt: true,
      registrationOpen: true,
      maxRegistrations: true,
    },
  });

  if (!event) {
    return { error: NextResponse.json({ message: "Event not found" }, { status: 404 }) };
  }

  // isRegistrationOpen maps the Prisma shape to what the helper expects
  if (!isRegistrationOpen(event)) {
    return {
      error: NextResponse.json(
        { message: `Registration for ${event.title} is not open right now.` },
        { status: 409 }
      ),
    };
  }

  if (event.maxRegistrations !== null) {
    const count = await prisma.registration.count({ where: { eventId: event.id } });

    if (count >= event.maxRegistrations) {
      return {
        error: NextResponse.json(
          { message: `${event.title} is full. Registration is now closed.` },
          { status: 409 }
        ),
      };
    }
  }

  return { event };
}

/** Handles a P2002 unique-constraint failure and any other insert error. */
function insertErrorResponse(error: unknown): NextResponse {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  ) {
    return NextResponse.json(
      { message: "You have already registered for this event with that registration number." },
      { status: 409 }
    );
  }

  console.error("[register] insert failed", error);
  return NextResponse.json(
    { message: "Could not save your registration. Please try again." },
    { status: 500 }
  );
}

/**
 * POST /api/events/[slug]/register
 *
 * Public endpoint. Validates the submission, re-checks server-side that the
 * event is actually live (a visitor could POST here regardless of what the UI
 * shows), then inserts the row.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (slug === VOLUNTEER_CALL_SLUG) {
    const parsed = VolunteerRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Please check the highlighted fields.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const resolved = await resolveOpenEvent(slug);
    if ("error" in resolved) return resolved.error;
    const { event } = resolved;

    const isPreReg = isPreRegistration(event);
    const formData: VolunteerFormData = {
      faculty: data.faculty,
      weaknesses: data.weaknesses,
      strengths: data.strengths,
      whyApply: data.whyApply,
      regret: data.regret,
      otherSociety: data.otherSociety === "yes",
      otherSocietyList: data.otherSocietyList?.trim() || null,
      skillRatings: Object.fromEntries(
        Object.entries(data.skillRatings).map(([key, value]) => [key, Number(value)])
      ) as VolunteerFormData["skillRatings"],
    };

    try {
      const inserted = await prisma.registration.create({
        data: {
          eventId: event.id,
          fullName: data.fullName,
          registrationNumber: data.registrationNumber.toUpperCase(),
          batch: Number(data.batch),
          email: data.email,
          phone: data.phone,
          hostel: null,
          aboutNetronix: null,
          skills: [],
          otherSkill: null,
          formData: formData as unknown as Prisma.InputJsonValue,
          isPreRegistration: isPreReg,
        },
        select: { id: true, createdAt: true, isPreRegistration: true },
      });

      return NextResponse.json(
        {
          id: inserted.id,
          submittedAt: inserted.createdAt,
          isPreRegistration: inserted.isPreRegistration,
          message: isPreReg
            ? `You are pre-registered for ${event.title}.`
            : `You are registered for ${event.title}.`,
        },
        { status: 201 }
      );
    } catch (error: unknown) {
      return insertErrorResponse(error);
    }
  }

  // ─── Every other event uses the shared registration schema ────────────────
  const parsed = RegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Please check the highlighted fields.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const resolved = await resolveOpenEvent(slug);
  if ("error" in resolved) return resolved.error;
  const { event } = resolved;

  const isPreReg = isPreRegistration(event);

  try {
    const inserted = await prisma.registration.create({
      data: {
        eventId: event.id,
        fullName: data.fullName,
        registrationNumber: data.registrationNumber.toUpperCase(),
        batch: Number(data.batch),
        email: data.email,
        phone: data.phone,
        hostel: data.hostel,
        aboutNetronix: data.aboutNetronix,
        skills: data.skills,
        otherSkill: data.otherSkill?.trim() || null,
        isPreRegistration: isPreReg,
      },
      select: { id: true, createdAt: true, isPreRegistration: true },
    });

    return NextResponse.json(
      {
        id: inserted.id,
        submittedAt: inserted.createdAt,
        isPreRegistration: inserted.isPreRegistration,
        message: isPreReg
          ? `You are pre-registered for ${event.title}.`
          : `You are registered for ${event.title}.`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return insertErrorResponse(error);
  }
}
