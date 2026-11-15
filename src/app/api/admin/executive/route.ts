import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { AMBASSADOR_CAMPAIGN } from "@/lib/ambassadors";
import { summarizeExecutiveRegistrations } from "@/lib/admin-executive";
import { PARTICIPANT_EVENT_SLUGS } from "@/lib/participants";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (admin.role !== "ADMIN") return NextResponse.json({ message: "System admin access required." }, { status: 403 });

    const [registrations, ambassadors] = await Promise.all([
      prisma.registration.findMany({
        where: { event: { slug: { in: PARTICIPANT_EVENT_SLUGS } } },
        orderBy: [{ fullName: "asc" }, { id: "asc" }],
        select: {
          id: true,
          fullName: true,
          event: { select: { slug: true } },
          city: true,
          university: true,
          ambassador: true,
          formData: true,
          paymentPaid: true,
          paymentDisposition: true,
          ambassadorVerifiedAt: true,
          paymentProofPath: true,
        },
      }),
      prisma.ambassadorApplication.findMany({
        where: { campaign: AMBASSADOR_CAMPAIGN.id },
        select: { code: true, fullName: true, university: true, participantCount: true },
      }),
    ]);

    return NextResponse.json(summarizeExecutiveRegistrations(registrations, ambassadors), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Executive dashboard query failed", error);
    return NextResponse.json({ message: "Couldn't load the executive dashboard." }, { status: 503 });
  }
}
