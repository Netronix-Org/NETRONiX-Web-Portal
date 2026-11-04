import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { getOrIssueParticipantPassword } from "@/lib/participant-credentials";
import { PARTICIPANT_EVENT_SLUGS } from "@/lib/participants";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    if (admin.role !== "ADMIN") return NextResponse.json({ message: "Executive admin access required." }, { status: 403 });

    const { id } = await params;
    const registration = await prisma.registration.findUnique({
      where: { id, event: { slug: { in: PARTICIPANT_EVENT_SLUGS } } },
      select: { email: true },
    });
    if (!registration) return NextResponse.json({ message: "Participant registration not found." }, { status: 404 });

    const password = await getOrIssueParticipantPassword(registration.email.trim().toLowerCase());
    return NextResponse.json({ password }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ message: "Couldn't load the participant password." }, { status: 503 });
  }
}
