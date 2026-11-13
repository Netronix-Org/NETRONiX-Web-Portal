import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin, requireSession } from "@/lib/auth";
import { Prisma, RegistrationStatus } from "@prisma/client";
import { isHncOrUgx } from "@/lib/events";
import { registrationAmbassadorNames, registrationRosterQuery, rosterPage, ROSTER_PAGE_SIZE } from "@/lib/admin-roster-query";
import { PARTICIPANT_EVENT_SLUGS } from "@/lib/participants";
import { removePaymentProof } from "@/lib/payment-storage";

/**
 * GET   /api/admin/registrations?eventId=...&q=...&page=0
 * PATCH /api/admin/registrations   { id, status?, adminNotes? }
 *
 * Submissions are always scoped to one event, which is what keeps the portal
 * unambiguous: you are never looking at two events' rows at once.
 */

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const eventId = searchParams.get("eventId");
  const page = rosterPage(searchParams);

  if (!eventId) {
    return NextResponse.json({ message: "eventId is required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } });
  if (!event) return NextResponse.json({ message: "Event not found" }, { status: 404 });
  const { where, orderBy } = await registrationRosterQuery(eventId, event.slug, searchParams);

  const [registrations, total] = await Promise.all([
    prisma.registration.findMany({
      where,
      orderBy,
      skip: page * ROSTER_PAGE_SIZE,
      take: ROSTER_PAGE_SIZE,
      include: { interviewScore: true },
    }),
    prisma.registration.count({ where }),
  ]);

  const ambassadorNames = isHncOrUgx(event.slug) ? await registrationAmbassadorNames(registrations) : {};
  return NextResponse.json({ registrations, ambassadorNames, total, page, pageSize: ROSTER_PAGE_SIZE }, { headers: { "Cache-Control": "private, no-store" } });
}

const PatchSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(RegistrationStatus).optional(),
  adminNotes: z.string().trim().max(2000).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid update" }, { status: 400 });
  }

  const { id, ...changes } = parsed.data;

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
  }

  try {
    const registration = await prisma.registration.update({
      where: { id },
      data: changes,
    });
    return NextResponse.json({ registration });
  } catch {
    return NextResponse.json({ message: "Submission not found" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    if (admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Executive admin access required." }, { status: 403 });
    }

    const id = z.uuid().safeParse(req.nextUrl.searchParams.get("id"));
    if (!id.success) return NextResponse.json({ message: "Invalid registration ID." }, { status: 400 });

    const deleted = await prisma.registration.delete({
      where: { id: id.data, event: { slug: { in: PARTICIPANT_EVENT_SLUGS } } },
      select: { paymentProofPath: true },
    });
    if (deleted.paymentProofPath) await removePaymentProof(deleted.paymentProofPath);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "HNC or UGX registration not found." }, { status: 404 });
    }
    return NextResponse.json({ message: "Couldn't delete the registration. Try again." }, { status: 503 });
  }
}
