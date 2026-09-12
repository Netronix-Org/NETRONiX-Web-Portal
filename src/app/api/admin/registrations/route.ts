import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { RegistrationStatus } from "@prisma/client";

/**
 * GET   /api/admin/registrations?eventId=...&q=...&page=0
 * PATCH /api/admin/registrations   { id, status?, adminNotes? }
 *
 * Submissions are always scoped to one event, which is what keeps the portal
 * unambiguous: you are never looking at two events' rows at once.
 */

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const eventId = searchParams.get("eventId");
  const query = searchParams.get("q")?.trim();
  const page = Math.max(0, Number(searchParams.get("page") ?? 0) || 0);

  if (!eventId) {
    return NextResponse.json({ message: "eventId is required" }, { status: 400 });
  }

  const where = {
    eventId,
    ...(query
      ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" as const } },
            { registrationNumber: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [registrations, total] = await Promise.all([
    prisma.registration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { interviewScore: true },
    }),
    prisma.registration.count({ where }),
  ]);

  return NextResponse.json({ registrations, total, page, pageSize: PAGE_SIZE });
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
