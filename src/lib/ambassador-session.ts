import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { ambassadorKey } from "./ambassador-credentials";
import { AMBASSADOR_CAMPAIGN } from "./ambassadors";
import { prisma } from "./prisma";

export const AMBASSADOR_SESSION_COOKIE = "netronix_ambassador_session";
const audience = "netronix-ambassador-portal";
const maxAge = 12 * 60 * 60;

export async function startAmbassadorSession(id: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(audience)
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(ambassadorKey("session"));
  (await cookies()).set(AMBASSADOR_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function getAmbassadorSession() {
  const token = (await cookies()).get(AMBASSADOR_SESSION_COOKIE)?.value;
  if (!token) return null;

  let id: string | undefined;
  try {
    const { payload } = await jwtVerify(token, ambassadorKey("session"), {
      algorithms: ["HS256"],
      audience,
    });
    id = payload.sub;
  } catch {
    return null;
  }
  if (!id) return null;

  return prisma.ambassadorApplication.findUnique({
    where: { id, campaign: AMBASSADOR_CAMPAIGN.id, passwordHash: { not: null } },
    select: { fullName: true, code: true },
  });
}
