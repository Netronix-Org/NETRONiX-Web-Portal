import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin-permissions.server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!await hasAdminPermission(admin.role, "complaints")) {
      return NextResponse.json({ message: "You don’t have access to the Complaints Desk." }, { status: 403 });
    }

    const { id } = await params;
    const ticketId = id.trim().toUpperCase();

    const complaint = await prisma.complaint.findUnique({
      where: { ticketId },
      include: {
        assignedTo: {
          select: { id: true, displayName: true, username: true, email: true, role: true },
        },
        history: {
          orderBy: { createdAt: "desc" },
          include: {
            changedBy: {
              select: { id: true, displayName: true, username: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json({ message: "Complaint not found" }, { status: 404 });
    }

    const mappedComplaint = {
      ...complaint,
      assignedTo: complaint.assignedTo ? {
        ...complaint.assignedTo,
        name: complaint.assignedTo.displayName || complaint.assignedTo.username,
      } : null,
      history: complaint.history.map(h => ({
        ...h,
        changedBy: h.changedBy ? {
          ...h.changedBy,
          name: h.changedBy.displayName || h.changedBy.username,
        } : null
      }))
    };

    return NextResponse.json({ complaint: mappedComplaint }, { status: 200 });
  } catch (error) {
    console.error("Admin complaint detail error:", error);
    return NextResponse.json(
      { message: "Failed to fetch complaint details" },
      { status: 500 }
    );
  }
}
