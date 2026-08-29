import { Role } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import readline from "readline";

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function main() {
  console.log("\n==========================================");
  console.log(" NETRONiX Admin Account Setup Utility");
  console.log("==========================================\n");

  // Read from env or prompt interactively
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "System Administrator";

  if (!email) {
    email = await askQuestion("Enter Administrator Email: ");
  }

  if (!email || !email.includes("@")) {
    console.error("❌ Error: A valid email address is required.");
    process.exit(1);
  }

  let username = process.env.ADMIN_USERNAME;
  if (!username) {
    const defaultUser = email.split("@")[0];
    const userPrompt = await askQuestion(`Enter Username (press enter for "${defaultUser}"): `);
    username = userPrompt.trim() || defaultUser;
  }

  if (!password) {
    password = await askQuestion("Enter Secure Password (min 8 characters): ");
  }

  if (!password || password.length < 8) {
    console.error("❌ Error: Password must be at least 8 characters long.");
    process.exit(1);
  }

  const cleanEmail = email.toLowerCase().trim();
  console.log(`\nProvisioning admin account for: ${cleanEmail}...`);

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { username },
    update: {
      email: cleanEmail,
      displayName: name,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: cleanEmail,
      username,
      displayName: name,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log("\n✅ Success! Admin account provisioned:");
  console.log(`   ID:       ${admin.id}`);
  console.log(`   Username: ${admin.username}`);
  console.log(`   Name:     ${admin.displayName}`);
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Role:     ${admin.role}\n`);
  console.log("You can now log in at /admin/login\n");
}

main()
  .catch((e) => {
    console.error("❌ Failed to create admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
