import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin-permissions.server";

/**
 * POST /api/admin/events — create a new event from the portal.
 * New events start as coming_soon, so nothing goes live by accident.
 */

const CreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and dashes only (e.g. hack-n-connect)"
    ),
  title: z.string().trim().min(2).max(150),
  subtitle: z.string().trim().max(150).optional(),
  description: z.string().trim().max(2000).default(""),
  imageSrc: z.string().trim().max(300).optional(),
  formIntro: z.string().trim().max(1000).optional(),
  sortOrder: z.number().int().default(100),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }
  if (!await hasAdminPermission(session.role, "events")) {
    return NextResponse.json({ message: "You don’t have access to event settings." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Please check the fields.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const event = await prisma.event.create({
      data: {
        ...parsed.data,
        status: "coming_soon",
      },
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { message: "An event with that slug already exists." },
        { status: 409 }
      );
    }
    console.error("[admin events] create failed", error);
    return NextResponse.json(
      { message: "Could not create the event." },
      { status: 500 }
    );
  }
}
