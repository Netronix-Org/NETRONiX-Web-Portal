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

    const [counts, recent24h] = await Promise.all([
      prisma.complaint.groupBy({ by: ["status"], _count: true }),
      prisma.complaint.count({ where: { createdAt: { gte: past24h } } }),
    ]);
    const countFor = (status: ComplaintStatus) =>
      counts.find((group) => group.status === status)?._count ?? 0;

    return NextResponse.json(
      {
        stats: {
          total: counts.reduce((total, group) => total + group._count, 0),
          reported: countFor(ComplaintStatus.REPORTED),
          assigned: countFor(ComplaintStatus.ASSIGNED),
          inProgress: countFor(ComplaintStatus.IN_PROGRESS),
          resolved: countFor(ComplaintStatus.RESOLVED),
          rejected: countFor(ComplaintStatus.REJECTED),
          recent24h,
        },
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { message: "Failed to load statistics" },
      { status: 500 }
    );
  }
}
