import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AMBASSADOR_CAMPAIGN } from "@/lib/ambassadors";
import { csvCell } from "@/lib/csv";
import { ambassadorRosterQuery, rosterPage, ROSTER_PAGE_SIZE } from "@/lib/admin-roster-query";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (admin.role !== "ADMIN") return NextResponse.json({ message: "Executive admin access required." }, { status: 403 });

    const params = req.nextUrl.searchParams;
    const exportCsv = params.get("format") === "csv";
    const { where, orderBy } = ambassadorRosterQuery(params);
    const page = rosterPage(params);
    const applicationsQuery = prisma.ambassadorApplication.findMany({
      where,
      orderBy,
      ...(!exportCsv && params.has("page") ? { skip: page * ROSTER_PAGE_SIZE, take: ROSTER_PAGE_SIZE } : {}),
      select: { id: true, code: true, fullName: true, cnic: true, phone: true, email: true, university: true, participantCount: true, createdAt: true, issuedPassword: true },
    });

    if (exportCsv) {
      const applications = await applicationsQuery;
      const header = ["Name", "Ambassador Code", "CNIC", "Phone", "Email", "University", "Expected Participants", "Submitted At"];
      const rows = applications.map((a) => [a.fullName, a.code, a.cnic, a.phone, a.email, a.university, a.participantCount, a.createdAt.toISOString()]);
      const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
      return new NextResponse("\uFEFF" + csv, { headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="netronix-ambassadors-${AMBASSADOR_CAMPAIGN.id}.csv"`,
        "Cache-Control": "private, no-store",
      } });
    }

    const [applications, summary] = await Promise.all([
      applicationsQuery,
      prisma.ambassadorApplication.aggregate({ where, _count: true, _sum: { participantCount: true } }),
    ]);
    return NextResponse.json({
      total: summary._count,
      expectedParticipants: summary._sum.participantCount ?? 0,
      pageSize: ROSTER_PAGE_SIZE,
      applications: applications.map(({ issuedPassword, ...application }) => ({
        ...application,
        passwordIssued: Boolean(issuedPassword),
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ message: "Couldn't load ambassador applications. Please retry." }, { status: 503 });
  }
}
