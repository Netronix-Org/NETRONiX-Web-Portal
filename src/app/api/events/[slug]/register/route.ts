import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RegistrationSchema } from "@/lib/validation/registration";
import { isRegistrationOpen, isPreRegistration } from "@/lib/events";

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

  // ─── Parse and validate ───────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

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

  // ─── Look up the event and confirm registration is genuinely open ─────────
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
    return NextResponse.json({ message: "Event not found" }, { status: 404 });
  }

  // isRegistrationOpen maps the Prisma shape to what the helper expects
  if (!isRegistrationOpen(event)) {
    return NextResponse.json(
      { message: `Registration for ${event.title} is not open right now.` },
      { status: 409 }
    );
  }

  // ─── Capacity check ───────────────────────────────────────────────────────
  if (event.maxRegistrations !== null) {
    const count = await prisma.registration.count({
      where: { eventId: event.id },
    });

    if (count >= event.maxRegistrations) {
      return NextResponse.json(
        { message: `${event.title} is full. Registration is now closed.` },
        { status: 409 }
      );
    }
  }

  // ─── Insert ───────────────────────────────────────────────────────────────
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
    // P2002 = unique constraint violation on (eventId, registrationNumber)
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        {
          message:
            "You have already registered for this event with that registration number.",
        },
        { status: 409 }
      );
    }

    console.error("[register] insert failed", error);
    return NextResponse.json(
      { message: "Could not save your registration. Please try again." },
      { status: 500 }
    );
  }
}
