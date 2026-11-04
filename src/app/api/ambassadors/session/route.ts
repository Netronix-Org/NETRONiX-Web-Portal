import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AMBASSADOR_SESSION_COOKIE, startAmbassadorSession } from "@/lib/ambassador-session";
import { AMBASSADOR_CAMPAIGN } from "@/lib/ambassadors";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().max(150).email(),
  password: z.string().length(8),
});
const windowMs = 15 * 60 * 1000;
// Fixed dummy bcrypt hash with the same work factor as issued credentials.
const dummyHash = "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function POST(req: NextRequest) {
  const ipLimit = checkRateLimit(`ambassador-login:ip:${getClientIp(req)}`, { limit: 20, windowMs });
  if (!ipLimit.allowed) return rateLimited(ipLimit.resetInSecs);

  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ message: "Send a JSON sign-in request." }, { status: 415 });
  }
  const parsed = LoginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter your email and eight-character password." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const emailLimit = checkRateLimit(`ambassador-login:email:${email}`, { limit: 5, windowMs });
  if (!emailLimit.allowed) return rateLimited(emailLimit.resetInSecs);

  try {
    const application = await prisma.ambassadorApplication.findUnique({
      where: { campaign_email: { campaign: AMBASSADOR_CAMPAIGN.id, email } },
      select: { id: true, passwordHash: true },
    });
    const valid = await bcrypt.compare(password, application?.passwordHash ?? dummyHash);
    if (!application?.passwordHash || !valid) {
      return NextResponse.json({ message: "Incorrect email or password." }, { status: 401 });
    }

    await startAmbassadorSession(application.id);
    return NextResponse.json({ signedIn: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ message: "Sign-in is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

export async function DELETE() {
  (await cookies()).delete(AMBASSADOR_SESSION_COOKIE);
  return new NextResponse(null, { status: 204 });
}

function rateLimited(seconds: number) {
  return NextResponse.json(
    { message: "Too many sign-in attempts. Please try again in a few minutes." },
    { status: 429, headers: { "Retry-After": String(seconds) } },
  );
}
