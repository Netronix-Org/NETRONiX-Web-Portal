import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { EventStatus } from "@prisma/client";

/**
 * PATCH /api/admin/events/[id]
 *
 * The endpoint behind the Coming Soon / Live Now switches and the go-live
 * date pickers in the portal. Every field is optional: send only what changed.
 */

const nullableDate = z
  .union([
    z.string().datetime({ offset: true }),
    z.string().datetime(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/),
    z.string().refine((val) => !isNaN(Date.parse(val))),
    z.literal(""),
    z.null(),
  ])
  .transform((v) => {
    if (!v || v === "" || v === null) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  })
  .optional();

const UpdateSchema = z.object({
  status: z.nativeEnum(EventStatus).optional(),
  autoLiveAt: nullableDate,
  autoCloseAt: nullableDate,
  registrationOpen: z.boolean().optional(),
  maxRegistrations: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).max(150).optional(),
  subtitle: z.string().trim().max(150).nullable().optional(),
  description: z.string().trim().max(2000).optional(),
  formIntro: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid update", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
  }

  try {
    const event = await prisma.event.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ event });
  } catch {
    return NextResponse.json({ message: "Event not found" }, { status: 404 });
  }
}

/** DELETE /api/admin/events/[id] — removes the event and all its submissions. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "Could not delete the event." },
      { status: 500 }
    );
  }
}
