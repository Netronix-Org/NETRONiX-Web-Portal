import { NextRequest, NextResponse } from "next/server";
import { revealAmbassadorPassword } from "@/lib/ambassador-credentials";
import { AMBASSADOR_CAMPAIGN } from "@/lib/ambassadors";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    if (admin.role !== "ADMIN") return NextResponse.json({ message: "Executive admin access required." }, { status: 403 });

    const { id } = await params;
    const application = await prisma.ambassadorApplication.findUnique({
      where: { id, campaign: AMBASSADOR_CAMPAIGN.id },
      select: { issuedPassword: true },
    });
    if (!application?.issuedPassword) {
      return NextResponse.json({ message: "No password has been issued for this application." }, { status: 404 });
    }
    return NextResponse.json(
      { password: revealAmbassadorPassword(id, application.issuedPassword) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ message: "Couldn't load the issued password." }, { status: 503 });
  }
}
