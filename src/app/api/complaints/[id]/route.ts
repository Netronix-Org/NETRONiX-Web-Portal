import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin-permissions.server";
import { isValidStatusTransition, StudentComplaintResponse } from "@/lib/types/complaints";
import {
  sendComplaintStatusUpdateEmail,
  sendComplaintResolvedEmail,
} from "@/lib/email";
import { ComplaintStatus } from "@prisma/client";

// ─── GET /api/complaints/[id]?email=... (Student Tracking) ───────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");

    // 1. Rate limiting on ticket lookup: 20 attempts per 5 mins per IP
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`track:${clientIp}`, {
      limit: 20,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          message: `Too many lookup attempts. Please wait ${rateLimit.resetInSecs} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    if (!id || !emailParam) {
      return NextResponse.json(
        { message: "Both Ticket ID and Email are required to track a complaint." },
        { status: 400 }
      );
    }

    const ticketId = id.trim().toUpperCase();
    const email = emailParam.trim().toLowerCase();

    // 2. Query DB: Requires exact match on BOTH ticketId AND email
    const complaint = await prisma.complaint.findFirst({
      where: {
        ticketId,
        email,
      },
      select: {
        ticketId: true,
        name: true,
        location: true,
        issueType: true,
        description: true,
        status: true,
        adminResponse: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
      },
    });

    if (!complaint) {
      // Generic error: prevents attackers from discovering valid Ticket IDs
      return NextResponse.json(
        { message: "Complaint not found or email does not match." },
        { status: 404 }
      );
    }

    const responsePayload: StudentComplaintResponse = {
      ticketId: complaint.ticketId,
      name: complaint.name,
      location: complaint.location,
      issueType: complaint.issueType,
      description: complaint.description,
      status: complaint.status.toLowerCase() as unknown as ComplaintStatus,
      adminResponse: complaint.adminResponse,
      createdAt: complaint.createdAt.toISOString(),
      updatedAt: complaint.updatedAt.toISOString(),
      resolvedAt: complaint.resolvedAt ? complaint.resolvedAt.toISOString() : null,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    console.error("Complaint tracking error:", error);
    return NextResponse.json(
      { message: "Unable to retrieve complaint status at this time." },
      { status: 500 }
    );
  }
}

// ─── Admin Update Schema ──────────────────────────────────────────────────────

const UpdateComplaintSchema = z.object({
  status: z.enum(["REPORTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REJECTED"]).optional(),
  assignedToId: z.string().uuid("Invalid staff ID").nullable().optional(),
  adminResponse: z.string().max(2000).nullable().optional(),
  notes: z.string().max(1000).optional(),
});

// ─── PATCH /api/complaints/[id] (Admin Status / Assignment / Response) ─────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify Admin / Manager authorization
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized. Admin session required." }, { status: 401 });
    }
    if (!await hasAdminPermission(admin.role, "complaints")) {
      return NextResponse.json({ message: "You don’t have access to the Complaints Desk." }, { status: 403 });
    }

    const { id } = await params;
    const ticketId = id.trim().toUpperCase();

    // 2. Validate update payload
    const body = await req.json();
    const parsed = UpdateComplaintSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const { status: newStatus, assignedToId, adminResponse, notes } = parsed.data;

    // 3. Find existing complaint
    const complaint = await prisma.complaint.findUnique({
      where: { ticketId },
      include: { assignedTo: true },
    });

    if (!complaint) {
      return NextResponse.json({ message: "Complaint not found" }, { status: 404 });
    }

    // 4. Validate status transition if status is being updated
    if (newStatus && newStatus !== complaint.status) {
      if (!isValidStatusTransition(complaint.status, newStatus)) {
        return NextResponse.json(
          {
            message: `Invalid status transition from ${complaint.status} to ${newStatus}.`,
          },
          { status: 400 }
        );
      }
    }

    // 5. Execute atomic update and audit history log in a transaction
    const isResolving = newStatus === "RESOLVED" && complaint.status !== "RESOLVED";
    const isReopening = complaint.status === "RESOLVED" && newStatus && newStatus !== "RESOLVED";

    const updatedComplaint = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { ticketId },
        data: {
          ...(newStatus ? { status: newStatus } : {}),
          ...(assignedToId !== undefined ? { assignedToId } : {}),
          ...(adminResponse !== undefined ? { adminResponse } : {}),
          ...(isResolving ? { resolvedAt: new Date() } : {}),
          ...(isReopening ? { resolvedAt: null } : {}),
        },
        include: {
          assignedTo: {
            select: { id: true, displayName: true, username: true, email: true, role: true },
          },
        },
      });

      // Record audit history entry
      if (newStatus && newStatus !== complaint.status) {
        await tx.complaintStatusHistory.create({
          data: {
            complaintId: complaint.id,
            changedById: admin.id,
            previousStatus: complaint.status,
            newStatus,
            notes: notes || adminResponse || `Status updated to ${newStatus} by ${admin.name}`,
          },
        });
      }

      return updated;
    });

    // 6. Trigger student notification email asynchronously
    if (newStatus && newStatus !== complaint.status) {
      if (newStatus === "RESOLVED") {
        sendComplaintResolvedEmail({
          to: complaint.email,
          studentName: complaint.name,
          ticketId: complaint.ticketId,
          adminResponse: adminResponse || complaint.adminResponse,
        }).catch((err) => console.error("Async resolved email error:", err));
      } else {
        sendComplaintStatusUpdateEmail({
          to: complaint.email,
          studentName: complaint.name,
          ticketId: complaint.ticketId,
          status: newStatus,
          adminResponse: adminResponse || complaint.adminResponse,
        }).catch((err) => console.error("Async status update email error:", err));
      }
    }

    const mappedComplaint = {
      ...updatedComplaint,
      assignedTo: updatedComplaint.assignedTo ? {
        ...updatedComplaint.assignedTo,
        name: updatedComplaint.assignedTo.displayName || updatedComplaint.assignedTo.username,
      } : null
    };

    return NextResponse.json({
      message: "Complaint updated successfully",
      complaint: mappedComplaint,
    });
  } catch (error) {
    console.error("Complaint update error:", error);
    return NextResponse.json(
      { message: "Failed to update complaint" },
      { status: 500 }
    );
  }
}
