import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { buildComplaintWhere } from "@/lib/complaint-filters";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const skip = (page - 1) * limit;

    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where = buildComplaintWhere(searchParams);

    // Execute count and list query concurrently
    const [total, complaints] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedTo: {
            select: { id: true, displayName: true, username: true, email: true, role: true },
          },
          _count: {
            select: { history: true },
          },
        },
      }),
    ]);

    const mappedComplaints = complaints.map(c => ({
      ...c,
      assignedTo: c.assignedTo ? {
        ...c.assignedTo,
        name: c.assignedTo.displayName || c.assignedTo.username,
      } : null
    }));

    return NextResponse.json(
      {
        complaints: mappedComplaints,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin complaints list error:", error);
    return NextResponse.json(
      { message: "Failed to fetch complaints" },
      { status: 500 }
    );
  }
}
