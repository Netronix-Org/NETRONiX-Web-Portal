import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { InterviewScorePatchSchema } from "@/lib/validation/interview-score";

/**
 * PATCH /api/admin/registrations/[id]/score
 *
 * Upserts the shared interview scorecard for one registration. Any admin may
 * call this — the scorecard has no per-panelist ownership, so this always
 * overwrites the whole thing with the caller's values.
 */
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
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const parsed = InterviewScorePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Please check the highlighted fields.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const registration = await prisma.registration.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!registration) {
    return NextResponse.json({ message: "Submission not found" }, { status: 404 });
  }

  const data = parsed.data;

  try {
    const { score, status } = await prisma.$transaction(async (tx) => {
      const score = await tx.interviewScore.upsert({
        where: { registrationId: id },
        create: { registrationId: id, scoredById: session.sub, ...data },
        update: { scoredById: session.sub, ...data },
      });

      // Scoring an interview moves it out of "pending" on its own. It never
      // overrides a decision (shortlisted/rejected) an admin already made.
      await tx.registration.updateMany({
        where: { id, status: "pending" },
        data: { status: "completed" },
      });

      const { status } = await tx.registration.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      });

      return { score, status };
    });

    return NextResponse.json({ score, status });
  } catch (error) {
    console.error("[score] upsert failed", error);
    return NextResponse.json(
      { message: "Could not save the score. Please try again." },
      { status: 500 }
    );
  }
}
