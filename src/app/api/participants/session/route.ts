import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendParticipantEmail } from "@/lib/event-registration-email";
import { getOrIssueParticipantPassword } from "@/lib/participant-credentials";
import { PARTICIPANT_COOKIE, startParticipantSession } from "@/lib/participant-session";
import { PARTICIPANT_EVENT_SLUGS, PARTICIPANT_PORTAL_URL } from "@/lib/participants";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const EmailSchema = z.string().trim().toLowerCase().max(150).email();
const RequestSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("login"), email: EmailSchema, password: z.string().length(8) }),
  z.object({ intent: z.literal("email-password"), email: EmailSchema }),
]);
const dummyHash = "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const noStore = { "Cache-Control": "private, no-store" };

export async function POST(req: NextRequest) {
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ message: "Send a JSON request." }, { status: 415 });
  }
  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`participant-session:ip:${ip}`, { limit: 30, windowMs: 15 * 60 * 1000 });
  if (!ipLimit.allowed) return limited(ipLimit.resetInSecs);

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Check your registration email and password." }, { status: 400 });
  }
  const { intent, email } = parsed.data;
  if (intent === "email-password") {
    const mailLimit = checkRateLimit(`participant-email:ip:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!mailLimit.allowed) return limited(mailLimit.resetInSecs);
    try {
      const registration = await prisma.registration.findFirst({
        where: { email: { equals: email, mode: "insensitive" }, event: { slug: { in: PARTICIPANT_EVENT_SLUGS } } },
        select: { id: true },
      });
      if (registration) {
        const password = await getOrIssueParticipantPassword(email);
        // Claim the reminder before contacting Brevo so concurrent requests cannot both send.
        const claim = await prisma.participantAccount.updateMany({
          where: { email, passwordReminderRequestedAt: null },
          data: { passwordReminderRequestedAt: new Date() },
        });
        if (claim.count) {
          const result = await sendParticipantEmail({
            id: randomUUID(),
            to: email,
            subject: "Your NETRONiX participant portal password",
            textContent: `Open the participant portal at ${PARTICIPANT_PORTAL_URL}\n\nSign-in email: ${email}\nPortal password: ${password}\n\nKeep your password private.`,
            tags: ["participant-access"],
          });
          // Only release the claim when no request was made to the email provider.
          if (!result.success && result.reason === "not_configured") {
            await prisma.participantAccount.update({
              where: { email },
              data: { passwordReminderRequestedAt: null },
            });
          }
        }
      }
    } catch {
      console.error("[participant-portal] Password email request failed");
    }
    return NextResponse.json({
      message: "Each registration email can receive one password reminder. Check your inbox and spam folder for it.",
    }, { headers: noStore });
  }

  const emailLimit = checkRateLimit(`participant-session:login:${email}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!emailLimit.allowed) return limited(emailLimit.resetInSecs);

  try {
    const account = await prisma.participantAccount.findUnique({ where: { email }, select: { passwordHash: true } });
    const valid = await bcrypt.compare(parsed.data.password, account?.passwordHash ?? dummyHash);
    if (!account || !valid) {
      return NextResponse.json({ message: "Incorrect email or password." }, { status: 401 });
    }
    await startParticipantSession(email);
    return NextResponse.json({ signedIn: true }, { headers: noStore });
  } catch {
    return NextResponse.json({ message: "Sign-in is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

export async function DELETE() {
  (await cookies()).delete(PARTICIPANT_COOKIE);
  return new NextResponse(null, { status: 204 });
}

function limited(seconds: number) {
  return NextResponse.json(
    { message: "Too many attempts. Please try again later." },
    { status: 429, headers: { "Retry-After": String(seconds) } },
  );
}
