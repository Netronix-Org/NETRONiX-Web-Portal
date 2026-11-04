import { issueAmbassadorPassword } from "../src/lib/ambassador-credentials";
import { prisma } from "../src/lib/prisma";

async function main() {
  const applications = await prisma.ambassadorApplication.findMany({
    where: { passwordHash: null },
    select: { id: true },
  });
  let issued = 0;
  for (const { id } of applications) {
    const { passwordHash, issuedPassword } = await issueAmbassadorPassword(id);
    const result = await prisma.ambassadorApplication.updateMany({
      where: { id, passwordHash: null },
      data: { passwordHash, issuedPassword },
    });
    issued += result.count;
  }

  const withoutEmail = await prisma.ambassadorApplication.count({ where: { email: null } });
  console.log(`Issued ${issued} passwords. Applications without a login email: ${withoutEmail}.`);
}

main()
  .catch(() => {
    console.error("Could not complete password issuance. Run this command again after resolving the configuration or database error.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
