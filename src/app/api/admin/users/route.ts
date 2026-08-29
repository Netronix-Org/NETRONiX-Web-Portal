import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin, hashPassword } from "@/lib/auth";
import { Role } from "@prisma/client";

const CreateUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(50).optional(),
  email: z.string().trim().email("Please provide a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  batch: z.number().int().min(30).max(40).nullable().optional(),
  role: z.enum(["ADMIN", "MANAGER"]).default("MANAGER"),
});

const UpdateUserSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
  isActive: z.boolean().optional(),
  role: z.enum(["ADMIN", "MANAGER"]).optional(),
  batch: z.number().int().min(30).max(40).nullable().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== Role.ADMIN) {
      return NextResponse.json(
        { message: "Forbidden. Only Administrators can view staff and junior accounts." },
        { status: 403 }
      );
    }

    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        role: true,
        batch: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: { assignedComplaints: true },
        },
      },
      orderBy: [{ role: "asc" }, { displayName: "asc" }],
    });

    const mappedUsers = users.map((u) => ({
      ...u,
      name: u.displayName || u.username,
    }));

    return NextResponse.json({ users: mappedUsers }, { status: 200 });
  } catch (error) {
    console.error("Admin users list error:", error);
    return NextResponse.json(
      { message: "Failed to load staff list" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only full ADMIN role can create new staff / junior users
    if (admin.role !== Role.ADMIN) {
      return NextResponse.json(
        { message: "Forbidden. Only Administrators can create new accounts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Invalid user data" },
        { status: 400 }
      );
    }

    const { name, email, password, role, batch } = parsed.data;
    const finalUsername = (parsed.data.username?.trim() || email.split("@")[0] + Math.floor(100 + Math.random() * 900)).toLowerCase();

    // Check if email or username already registered
    const existing = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: finalUsername },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "An account with this email or username already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.adminUser.create({
      data: {
        displayName: name,
        username: finalUsername,
        email: email.toLowerCase(),
        passwordHash,
        role,
        batch: batch ?? null,
        isActive: true,
      },
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        role: true,
        batch: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: `${role === "ADMIN" ? "Admin" : "Junior coordinator"} account created successfully`,
        user: { ...newUser, name: newUser.displayName },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create admin user error:", error);
    return NextResponse.json(
      { message: "Failed to create account" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== Role.ADMIN) {
      return NextResponse.json(
        { message: "Forbidden. Only Administrators can modify accounts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = UpdateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const { id, isActive, role, batch, password } = parsed.data;

    // Prevent deactivating own account
    if (id === admin.id && isActive === false) {
      return NextResponse.json(
        { message: "You cannot deactivate your own account." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (role) updateData.role = role;
    if (batch !== undefined) updateData.batch = batch;
    if (password) updateData.passwordHash = await hashPassword(password);

    const updated = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        role: true,
        batch: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ message: "Account updated successfully", user: updated }, { status: 200 });
  } catch (error) {
    console.error("Update admin user error:", error);
    return NextResponse.json({ message: "Failed to update account" }, { status: 500 });
  }
}
