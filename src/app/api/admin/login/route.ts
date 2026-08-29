import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  setSessionCookie,
  isAuthConfigured,
} from "@/lib/auth";

// bcrypt is a Node API — this route must not run on the Edge runtime.
export const runtime = "nodejs";

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});

/** POST /api/admin/login — username + password → session cookie. */
export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        message:
          "Admin portal is not configured. Set ADMIN_SESSION_SECRET in .env.local.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Enter a username and password" },
      { status: 400 }
    );
  }

  const { username, password } = parsed.data;

  const user = await prisma.adminUser.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      displayName: true,
      role: true,
      batch: true,
      isActive: true,
    },
  });

  // Compare against a dummy hash when the user does not exist, so the response
  // takes the same time either way and cannot be used to enumerate usernames.
  const hash =
    user?.passwordHash ??
    "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid) {
    return NextResponse.json(
      { message: "Incorrect username or password" },
      { status: 401 }
    );
  }

  if (!user.isActive) {
    return NextResponse.json(
      { message: "This account has been deactivated. Please contact an Administrator." },
      { status: 403 }
    );
  }

  const token = await createSessionToken({
    sub: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    batch: user.batch,
  });

  await setSessionCookie(token);

  // Best-effort: update lastLoginAt without blocking the response.
  prisma.adminUser
    .update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    .catch(() => {});

  return NextResponse.json({
    username: user.username,
    displayName: user.displayName,
  });
}
