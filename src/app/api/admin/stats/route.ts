import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin-permissions.server";
import { ComplaintStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!await hasAdminPermission(admin.role, "complaints")) {
      return NextResponse.json({ message: "You don’t have access to the Complaints Desk." }, { status: 403 });
    }

    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      total,
      reported,
      assigned,
      inProgress,
      resolved,
      rejected,
      recent24h,
    ] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: ComplaintStatus.REPORTED } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.ASSIGNED } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.IN_PROGRESS } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.RESOLVED } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.REJECTED } }),
      prisma.complaint.count({ where: { createdAt: { gte: past24h } } }),
    ]);

    return NextResponse.json(
      {
        stats: {
          total,
          reported,
          assigned,
          inProgress,
          resolved,
          rejected,
          recent24h,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { message: "Failed to load statistics" },
      { status: 500 }
    );
  }
}
