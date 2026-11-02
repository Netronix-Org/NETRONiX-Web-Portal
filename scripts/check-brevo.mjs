/** Read-only: node --import tsx scripts/check-brevo.mjs
 * Send exactly one clearly marked test: add --send-test recipient@example.com
 */
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { z } from "zod";
import { sendRegistrationConfirmation } from "../src/lib/event-registration-email.ts";

config({ path: ".env.local", quiet: true });

async function main() {
  for (const key of ["BREVO_API_KEY", "BREVO_SENDER_EMAIL"]) {
    if (!process.env[key]?.trim()) throw new Error(`${key} is missing. Save it in .env.local.`);
  }
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--send-test" || !z.email().safeParse(args[1]).success)) {
    throw new Error("Usage: node --import tsx scripts/check-brevo.mjs [--send-test recipient@example.com]");
  }

  const sender = process.env.BREVO_SENDER_EMAIL.trim();
  const headers = { "api-key": process.env.BREVO_API_KEY.trim(), Accept: "application/json" };
  for (const endpoint of ["account", "senders"]) {
    const response = await fetch(`https://api.brevo.com/v3/${endpoint}`, { headers, signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      // Restricted send-only keys may intentionally disallow read-only diagnostics.
      console.log(`Brevo ${endpoint} check: HTTP ${response.status}. Check API permissions if this check is needed.`);
      continue;
    }
    const data = await response.json();
    if (endpoint === "account") {
      console.log(`Brevo API authentication: accepted. Transactional sending: ${data.relay?.enabled ? "enabled" : "not enabled"}.`);
    } else {
      const match = data.senders?.find((item) => item.email.toLowerCase() === sender.toLowerCase());
      console.log(`Configured sender: ${match?.active ? "active" : match ? "inactive" : "not found in sender list"}.`);
    }
  }

  if (args.length) {
    const result = await sendRegistrationConfirmation({
      id: randomUUID(), to: args[1], fullName: "NETRONiX Test Recipient", slug: "ugx",
      phone: "00000000000", cnic: "0000000000000", city: "Sample City",
      ambassador: "Sample Ambassador", university: "Sample University",
      transport: "yes",
      eventTitle: "UGX — Uber.Game X", isPreRegistration: false, game: "FC26", isTest: true,
    });
    if (!result.success) throw new Error(`Brevo did not accept the test email: ${result.reason}.`);
    console.log(`One test confirmation accepted by Brevo. Message ID: ${result.messageId}. Check the inbox/spam folder and Brevo transactional logs for delivery.`);
  } else {
    console.log("No email sent. Add --send-test recipient@example.com to send one test.");
  }
}

main().catch(() => {
  // Avoid printing provider/network errors that may include headers or account data.
  console.error("Brevo check failed. Verify the local configuration, API permissions, sender activation and network connection. No credentials have been printed.");
  process.exitCode = 1;
});
