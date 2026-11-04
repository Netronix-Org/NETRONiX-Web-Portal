/** Run with: node --import tsx scripts/verify-event-registrations.mjs
 * Exercises the real public handlers with isolated events. All database writes
 * roll back; event lookups are redirected only inside this test process.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.ts";
import { AMBASSADOR_CAMPAIGN } from "../src/lib/ambassadors.ts";
import { POST } from "../src/app/api/events/[slug]/register/route.ts";

const rollback = new Error("ROLL_BACK_SYNTHETIC_FIXTURES");
const originalFetch = globalThis.fetch;
const mailRequests = [];
let rejectEmail = false;
// Never send real mail from database tests, even with a real key configured.
globalThis.fetch = async (url, options) => {
  assert.equal(url, "https://api.brevo.com/v3/smtp/email");
  mailRequests.push(JSON.parse(options.body));
  return Response.json(rejectEmail ? { code: "not_enough_credits" } : { messageId: "synthetic-message" }, { status: rejectEmail ? 429 : 201 });
};
process.env.BREVO_API_KEY ||= "synthetic-key";
process.env.BREVO_SENDER_EMAIL ||= "events@example.invalid";

async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      const transaction = prisma.$transaction;
      // Route writes must use the outer test transaction so fixtures can be rolled back.
      prisma.$transaction = (run) => run(tx);
      let portalPassword;
      try {
      const ambassador = await tx.ambassadorApplication.create({
        data: {
          campaign: AMBASSADOR_CAMPAIGN.id,
          fullName: "Synthetic code verification",
          cnic: "0000000000042",
          phone: "00000000000",
          university: "Synthetic University",
          participantCount: 1,
        },
        select: { code: true },
      });
      const ambassadorCode = String(ambassador.code);
      assert.match(ambassadorCode, /^[1-9]\d{3}$/);
      for (const slug of ["ugx", "hack-n-connect"]) {
        const firstChoices = slug === "ugx" ? { game: "FC26" } : { registrationType: "Participant", socials: "No" };
        const secondChoices = slug === "ugx" ? { game: "Tekken 8" } : { registrationType: "Observer", socials: "Yes" };
        const event = await tx.event.create({ data: { slug: `synthetic-${randomUUID()}`, title: "Synthetic form verification", status: "coming_soon", registrationOpen: true } });
        const lookup = prisma.event.findUnique;
        const lookupAmbassador = prisma.ambassadorApplication.findUnique;
        const update = prisma.registration.update;
        const initialMailCount = mailRequests.length;
        prisma.event.findUnique = async () => event;
        prisma.ambassadorApplication.findUnique = (args) => tx.ambassadorApplication.findUnique(args);
        prisma.registration.update = (args) => tx.registration.update(args);
        const post = (body) => POST(new NextRequest(`http://localhost/api/events/${slug}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ slug }) });
        try {
          const missing = await post({});
          assert.equal(missing.status, 400);
          assert.deepEqual(Object.keys((await missing.json()).errors).sort(), ["city", "cnic", "email", "fullName", "phone", "transport", ...Object.keys(firstChoices)].sort());

          const body = { fullName: "Synthetic Participant", phone: "+92 (000) 000-0000", email: " TEST@Example.COM ", cnic: "00000-0000000-0", city: " Test City ", transport: "no", ...firstChoices };
          for (const code of ["123", "ABCD", "0000"]) {
            const invalidCode = await post({ ...body, ambassadorCode: code });
            assert.equal(invalidCode.status, 400);
            assert.ok((await invalidCode.json()).errors.ambassadorCode);
          }
          for (const transport of [undefined, "", "maybe", false]) assert.equal((await post({ ...body, transport })).status, 400);
          if (slug === "ugx") {
            for (const game of [undefined, "", "Other"]) assert.equal((await post({ ...body, game })).status, 400);
          }
          const lookupAccount = tx.participantAccount.findUnique;
          tx.participantAccount.findUnique = async () => { throw new Error("Synthetic credential lookup failure"); };
          try {
            assert.equal((await post(body)).status, 503);
            assert.equal(await tx.registration.count({ where: { eventId: event.id } }), 0);
            assert.equal(mailRequests.length, initialMailCount);
          } finally {
            tx.participantAccount.findUnique = lookupAccount;
          }
          const response = await post(body);
          assert.equal(response.status, 201);
          const result = await response.json();
          assert.equal(result.isPreRegistration, true);
          assert.equal(result.emailSent, true);
          const saved = await tx.registration.findUniqueOrThrow({ where: { id: result.id } });
          assert.equal(saved.cnic, "0000000000000");
          assert.equal(saved.email, "test@example.com");
          assert.equal(saved.phone, "+920000000000");
          assert.equal(saved.city, "Test City");
          assert.deepEqual(saved.formData, { transport: "no", ...firstChoices });
          assert.ok(saved.emailSentAt);
          assert.equal(mailRequests.length, initialMailCount + 1);
          assert.equal(mailRequests.at(-1).to[0].email, "test@example.com");
          const password = mailRequests.at(-1).textContent.match(/^Portal password: ([A-Za-z0-9_-]{8})$/m)?.[1];
          assert.ok(password, "Registration confirmation should include the portal password.");
          if (portalPassword) assert.ok(password === portalPassword, "HNC and UGX should use the same account password.");
          portalPassword = password;
          assert.ok(mailRequests.at(-1).textContent.includes(saved.id));
          for (const field of ["fullName", "phone", "email", "cnic", "city"]) assert.ok(mailRequests.at(-1).textContent.includes(saved[field]));
          assert.ok(mailRequests.at(-1).textContent.includes("Ambassador: Not provided"));
          assert.ok(mailRequests.at(-1).textContent.includes("University: Not provided"));
          assert.ok(mailRequests.at(-1).textContent.includes("Transport: No"));
          if (slug === "hack-n-connect") {
            assert.ok(mailRequests.at(-1).textContent.includes("Registration type: Participant"));
            assert.ok(mailRequests.at(-1).textContent.includes("Socials opt-in: No"));
          }
          for (const field of ["registrationNumber", "batch", "ambassador", "university"]) assert.equal(saved[field], null);
          await tx.$executeRawUnsafe("SAVEPOINT duplicate_check");
          assert.equal((await post({ ...body, cnic: "0000000000000" })).status, 409);
          await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT duplicate_check");
          assert.equal(mailRequests.length, initialMailCount + 1);

          const withOptionals = await post({ ...body, cnic: "0000000000001", ambassador: " Test Ambassador ", ambassadorCode, university: " Test University ", transport: "yes", ...secondChoices });
          assert.equal(withOptionals.status, 201);
          const extra = await tx.registration.findUniqueOrThrow({ where: { id: (await withOptionals.json()).id } });
          assert.equal(extra.ambassador, "Test Ambassador");
          assert.equal(extra.university, "Test University");
          assert.deepEqual(extra.formData, { transport: "yes", ...secondChoices, ambassadorCode });
          assert.ok(extra.emailSentAt);
          assert.ok(mailRequests.at(-1).textContent.includes(extra.ambassador));
          assert.ok(mailRequests.at(-1).textContent.includes(`Ambassador code: ${ambassadorCode}`));
          assert.ok(mailRequests.at(-1).textContent.includes(extra.university));
          assert.ok(mailRequests.at(-1).textContent.includes("Transport: Yes"));
          if (slug === "hack-n-connect") {
            assert.ok(mailRequests.at(-1).textContent.includes("Registration type: Observer"));
            assert.ok(mailRequests.at(-1).textContent.includes("Socials opt-in: Yes"));
          }
          assert.ok(mailRequests.at(-1).htmlContent.includes(`/brand/${slug === "ugx" ? "ugx" : "hnc"}.png`));

          rejectEmail = true;
          const emailFailure = await post({ ...body, cnic: "0000000000002" });
          assert.equal(emailFailure.status, 201);
          const failedResult = await emailFailure.json();
          assert.equal(failedResult.emailSent, false);
          assert.equal((await tx.registration.findUniqueOrThrow({ where: { id: failedResult.id } })).emailSentAt, null);
          rejectEmail = false;

          prisma.registration.update = async () => { throw new Error("Synthetic timestamp failure"); };
          const timestampFailure = await post({ ...body, cnic: "0000000000003" });
          assert.equal(timestampFailure.status, 201);
          assert.equal((await timestampFailure.json()).emailSent, true);
          prisma.registration.update = (args) => tx.registration.update(args);

          event.registrationOpen = false;
          assert.equal((await post({ ...body, cnic: "0000000000004" })).status, 409);
          assert.equal(await tx.registration.count({ where: { eventId: event.id } }), 4);
          assert.equal(mailRequests.length, initialMailCount + 4);
        } finally {
          prisma.event.findUnique = lookup;
          prisma.ambassadorApplication.findUnique = lookupAmbassador;
          prisma.registration.update = update;
          rejectEmail = false;
        }
      }
        throw rollback;
      } finally {
        prisma.$transaction = transaction;
      }
    }, { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("PASS: both event handlers validate and save registration details and games, request confirmation once per new registration, record accepted emails, preserve saved registrations on email/timestamp failures, and reject duplicates/closed events without sending mail. All fixtures rolled back; all email requests mocked.");
}

main().catch((error) => {
  console.error("Event form verification failed:", error instanceof Error ? error.message.slice(0, 500) : "Database or handler failure.");
  process.exitCode = 1;
}).finally(() => { globalThis.fetch = originalFetch; return prisma.$disconnect(); });
