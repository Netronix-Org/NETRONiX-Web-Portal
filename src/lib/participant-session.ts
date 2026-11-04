import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { ambassadorKey } from "./ambassador-credentials";
import { prisma } from "./prisma";

export const PARTICIPANT_COOKIE = "netronix_participant_session";
const audience = "netronix-participant-portal";

export async function startParticipantSession(email: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(audience)
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(ambassadorKey("participant-session"));

  (await cookies()).set(PARTICIPANT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

export async function getParticipantEmail() {
  const token = (await cookies()).get(PARTICIPANT_COOKIE)?.value;
  if (!token) return null;

  let email: string | undefined;
  try {
    const { payload } = await jwtVerify(token, ambassadorKey("participant-session"), {
      algorithms: ["HS256"],
      audience,
    });
    email = payload.sub;
  } catch {
    return null;
  }
  if (!email) return null;
  const account = await prisma.participantAccount.findUnique({ where: { email }, select: { email: true } });
  return account?.email ?? null;
}
