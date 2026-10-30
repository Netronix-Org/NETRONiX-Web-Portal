import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AMBASSADOR_CAMPAIGN } from "@/lib/ambassadors";
import { csvCell } from "@/lib/csv";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (admin.role !== "ADMIN") return NextResponse.json({ message: "Executive admin access required." }, { status: 403 });

    const applications = await prisma.ambassadorApplication.findMany({
      where: { campaign: AMBASSADOR_CAMPAIGN.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, cnic: true, phone: true, email: true, university: true, participantCount: true, createdAt: true },
    });

    if (req.nextUrl.searchParams.get("format") === "csv") {
      const header = ["Name", "CNIC", "Phone", "Email", "University", "Expected Participants", "Submitted At"];
      const rows = applications.map((a) => [a.fullName, a.cnic, a.phone, a.email, a.university, a.participantCount, a.createdAt.toISOString()]);
      const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
      return new NextResponse("\uFEFF" + csv, { headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="netronix-ambassadors-${AMBASSADOR_CAMPAIGN.id}.csv"`,
        "Cache-Control": "private, no-store",
      } });
    }

    return NextResponse.json({ applications }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ message: "Couldn't load ambassador applications. Please retry." }, { status: 503 });
  }
}
