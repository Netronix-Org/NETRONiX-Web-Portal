import type { Prisma } from "@prisma/client";
import { issueAmbassadorPassword, revealAmbassadorPassword } from "./ambassador-credentials";
import { prisma } from "./prisma";

/** Keep the same credentials when a participant enters either event or requests a reminder. */
export async function getOrIssueParticipantPassword(
  email: string,
  db: Pick<Prisma.TransactionClient, "participantAccount"> = prisma,
) {
  const key = `participant:${email}`;
  const existing = await db.participantAccount.findUnique({ where: { email }, select: { issuedPassword: true } });
  if (existing) return revealAmbassadorPassword(key, existing.issuedPassword);

  const { password, ...credentials } = await issueAmbassadorPassword(key);
  const result = await db.participantAccount.createMany({
    data: { email, ...credentials },
    skipDuplicates: true,
  });
  if (result.count) return password;

  // The other registration may have created this account while the hash was generated.
  const winner = await db.participantAccount.findUniqueOrThrow({ where: { email }, select: { issuedPassword: true } });
  return revealAmbassadorPassword(key, winner.issuedPassword);
}
