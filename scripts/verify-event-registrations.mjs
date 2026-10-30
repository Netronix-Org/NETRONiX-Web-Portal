/** Run with: node --import tsx scripts/verify-event-registrations.mjs
 * Exercises the real public handlers with isolated events. All database writes
 * roll back; event lookups are redirected only inside this test process.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.ts";
import { POST } from "../src/app/api/events/[slug]/register/route.ts";

const rollback = new Error("ROLL_BACK_SYNTHETIC_FIXTURES");

async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      for (const slug of ["ugx", "hack-n-connect"]) {
        const event = await tx.event.create({ data: { slug: `synthetic-${randomUUID()}`, title: "Synthetic form verification", status: "coming_soon", registrationOpen: true } });
        const lookup = prisma.event.findUnique;
        const insert = prisma.registration.create;
        prisma.event.findUnique = async () => event;
        prisma.registration.create = (args) => tx.registration.create(args);
        const post = (body) => POST(new NextRequest(`http://localhost/api/events/${slug}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ slug }) });
        try {
          const missing = await post({});
          assert.equal(missing.status, 400);
          assert.deepEqual(Object.keys((await missing.json()).errors).sort(), ["city", "cnic", "email", "fullName", "phone"]);

          const body = { fullName: "Synthetic Participant", phone: "+92 (000) 000-0000", email: " TEST@Example.COM ", cnic: "00000-0000000-0", city: " Test City " };
          const response = await post(body);
          assert.equal(response.status, 201);
          const result = await response.json();
          assert.equal(result.isPreRegistration, true);
          const saved = await tx.registration.findUniqueOrThrow({ where: { id: result.id } });
          assert.equal(saved.cnic, "0000000000000");
          assert.equal(saved.email, "test@example.com");
          assert.equal(saved.phone, "+920000000000");
          assert.equal(saved.city, "Test City");
          for (const field of ["registrationNumber", "batch", "ambassador", "university"]) assert.equal(saved[field], null);
          await tx.$executeRawUnsafe("SAVEPOINT duplicate_check");
          assert.equal((await post({ ...body, cnic: "0000000000000" })).status, 409);
          await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT duplicate_check");

          const withOptionals = await post({ ...body, cnic: "0000000000001", ambassador: " Test Ambassador ", university: " Test University " });
          assert.equal(withOptionals.status, 201);
          const extra = await tx.registration.findUniqueOrThrow({ where: { id: (await withOptionals.json()).id } });
          assert.equal(extra.ambassador, "Test Ambassador");
          assert.equal(extra.university, "Test University");

          event.registrationOpen = false;
          assert.equal((await post({ ...body, cnic: "0000000000002" })).status, 409);
          assert.equal(await tx.registration.count({ where: { eventId: event.id } }), 2);
        } finally {
          prisma.event.findUnique = lookup;
          prisma.registration.create = insert;
        }
      }
      throw rollback;
    }, { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("PASS: both event handlers validate all five required fields, save normalized data, accept optional fields, reject duplicate CNICs, and honor closed registration. All fixtures rolled back.");
}

main().catch((error) => {
  console.error("Event form verification failed:", error instanceof Error ? error.message.slice(0, 500) : "Database or handler failure.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
