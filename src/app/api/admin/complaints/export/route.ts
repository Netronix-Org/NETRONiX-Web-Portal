import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { buildComplaintWhere } from "@/lib/complaint-filters";
import { csvCell } from "@/lib/csv";

/**
 * GET /api/admin/complaints/export?query=&status=&issueType=&assignedToId=
 *
 * Downloads the complaints matching the desk's current filters as CSV (all
 * matching rows, not just the visible page).
 */

const COLUMNS = [
  "Ticket ID",
  "Submitted At",
  "Name",
  "Email",
  "Location",
  "Issue Type",
  "Status",
  "Assigned To",
  "Description",
  "Admin Response",
  "Resolved At",
  "Last Updated",
] as const;

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const complaints = await prisma.complaint.findMany({
      where: buildComplaintWhere(req.nextUrl.searchParams),
      orderBy: { createdAt: "desc" },
      include: { assignedTo: { select: { displayName: true, username: true } } },
    });

    const rows = complaints.map((c) =>
      [
        c.ticketId,
        c.createdAt.toISOString(),
        c.name,
        c.email,
        c.location,
        c.issueType,
        c.status,
        c.assignedTo ? c.assignedTo.displayName || c.assignedTo.username : "",
        c.description,
        c.adminResponse,
        c.resolvedAt?.toISOString(),
        c.updatedAt.toISOString(),
      ]
        .map(csvCell)
        .join(",")
    );

    const csv = [COLUMNS.map(csvCell).join(","), ...rows].join("\r\n");

    // BOM so Excel opens UTF-8 names correctly.
    return new NextResponse("﻿" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="netronix-complaints-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Admin complaints export error:", error);
    return NextResponse.json({ message: "Failed to export complaints" }, { status: 500 });
  }
}
