/** Run against a local production build. All payment images and rows are synthetic. */
import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { ambassadorKey } from "../src/lib/ambassador-credentials";
import { AMBASSADOR_CAMPAIGN } from "../src/lib/ambassadors";
import { getOrIssueParticipantPassword } from "../src/lib/participant-credentials";
import { PAYMENT_BUCKET } from "../src/lib/participants";
import { paymentStorageFetch, removePaymentProof } from "../src/lib/payment-storage";
import { prisma } from "../src/lib/prisma";

async function main() {
  const base = new URL(process.argv[2] ?? "http://127.0.0.1:3101");
  assert.ok(["127.0.0.1", "localhost"].includes(base.hostname), "Use a local build.");
  const marker = randomUUID();
  const email = `participant-${marker}@example.invalid`;
  const otherEmail = `other-${marker}@example.invalid`;
  const cnic = () => `00000${String(randomInt(100_000_000)).padStart(8, "0")}`;
  const registrationIds: string[] = [];
  let ambassadorId: string | undefined;

  function call(path: string, options?: RequestInit) {
    return fetch(new URL(path, base), options);
  }

  async function login(address: string) {
    const password = await getOrIssueParticipantPassword(address);
    const response = await call("/api/participants/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "login", email: address.toUpperCase(), password }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie");
    assert.ok(cookie?.includes("HttpOnly") && cookie.includes("Secure"));
    return { Cookie: cookie!.split(";")[0] };
  }

  try {
    const events = await prisma.event.findMany({ where: { slug: { in: ["hack-n-connect", "ugx"] } }, select: { id: true, slug: true } });
    assert.equal(events.length, 2);
    const ambassador = await prisma.ambassadorApplication.create({
      data: {
        campaign: AMBASSADOR_CAMPAIGN.id, fullName: "Synthetic payment verification ambassador",
        cnic: cnic(), phone: "00000000000", university: "Synthetic", participantCount: 1,
        passwordHash: "synthetic-session-fixture",
      },
      select: { id: true, code: true },
    });
    ambassadorId = ambassador.id;
    const ownName = `Synthetic HNC ${marker}`;
    const secondName = `Synthetic UGX ${marker}`;
    const otherName = `Synthetic unrelated ${marker}`;
    const [own, second, other] = await prisma.registration.createManyAndReturn({
      data: [
        { fullName: ownName, email, eventId: events.find((e) => e.slug === "hack-n-connect")!.id, formData: { ambassadorCode: String(ambassador.code) } },
        { fullName: secondName, email, eventId: events.find((e) => e.slug === "ugx")!.id, formData: {} },
        { fullName: otherName, email: otherEmail, eventId: events[0].id, formData: {} },
      ].map((row) => ({ ...row, cnic: cnic(), phone: "00000000000", skills: [] })),
      select: { id: true },
    });
    registrationIds.push(own.id, second.id, other.id);
    const participant = await login(email);
    const ambassadorToken = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(ambassador.id)
      .setAudience("netronix-ambassador-portal").setExpirationTime("2m").sign(ambassadorKey("session"));
    const ambassadorHeaders = { Cookie: `netronix_ambassador_session=${ambassadorToken}` };

    const adminHeaders = async (role: "ADMIN" | "MANAGER") => {
      const admin = await prisma.adminUser.findFirst({ where: { role, isActive: true }, select: { id: true, username: true } });
      if (!admin) return null;
      const token = await new SignJWT({ username: admin.username, role: "ADMIN" }).setProtectedHeader({ alg: "HS256" })
        .setSubject(admin.id).setExpirationTime("2m").sign(new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET));
      return { Cookie: `netronix_admin_session=${token}` };
    };
    const executive = await adminHeaders("ADMIN");
    const manager = await adminHeaders("MANAGER");
    assert.ok(executive);
    const credentials = (id: string, headers?: HeadersInit) =>
      call(`/api/admin/registrations/${id}/credentials`, { method: "POST", headers });
    assert.equal((await credentials(own.id)).status, 401);
    assert.equal((await credentials(own.id, participant)).status, 401);
    assert.equal((await credentials(own.id, ambassadorHeaders)).status, 401);
    if (manager) assert.equal((await credentials(own.id, manager)).status, 403);
    assert.equal((await credentials(randomUUID(), executive)).status, 404);
    const revealed = await credentials(own.id, executive);
    assert.equal(revealed.status, 200);
    assert.equal(revealed.headers.get("cache-control"), "private, no-store");
    const sharedPassword = await getOrIssueParticipantPassword(email);
    assert.deepEqual(await revealed.json(), { password: sharedPassword });
    assert.deepEqual(await (await credentials(second.id, executive)).json(), { password: sharedPassword });
    assert.equal(await prisma.participantAccount.count({ where: { email: otherEmail } }), 0);
    const legacy = await credentials(other.id, executive);
    assert.equal(legacy.status, 200);
    assert.deepEqual(await legacy.json(), { password: await getOrIssueParticipantPassword(otherEmail) });

    const stranger = await login(otherEmail);
    const portal = await call("/participants/portal", { headers: participant });
    assert.equal(portal.status, 200);
    assert.ok(portal.headers.get("cache-control")?.includes("no-store"));
    const roster = await portal.text();
    assert.ok(roster.includes(ownName) && roster.includes(secondName) && !roster.includes(otherName));
    assert.ok(!(await (await call("/participants/portal")).text()).includes(ownName));

    const endpoint = `/api/participants/registrations/${own.id}/payment`;
    const png = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9ZkAAAAASUVORK5CYII=", "base64"));
    const upload = (headers: HeadersInit, body = png) => call(endpoint, {
      method: "POST", headers: { ...headers, "Content-Type": "image/png" }, body,
    });
    assert.equal((await upload({})).status, 401);
    assert.equal((await upload(stranger)).status, 404);
    assert.equal((await upload(participant, new Uint8Array([1, 2, 3]))).status, 400);
    assert.equal((await upload(participant)).status, 200);
    const proofPath = (await prisma.registration.findUniqueOrThrow({ where: { id: own.id } })).paymentProofPath;
    assert.ok(proofPath);
    const remove = (headers: HeadersInit, expectedProofPath = proofPath) => call(endpoint, {
      method: "DELETE", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ expectedProofPath }),
    });
    const read = await call(endpoint, { headers: participant });
    assert.equal(read.status, 200);
    assert.deepEqual(new Uint8Array(await read.arrayBuffer()), png);
    assert.equal(read.headers.get("cache-control"), "private, no-store");
    const downloadUrl = `${endpoint}?download=1`;
    const download = await call(downloadUrl, { headers: participant });
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-disposition"), 'attachment; filename="payment-screenshot.png"');
    assert.deepEqual(new Uint8Array(await download.arrayBuffer()), png);
    assert.equal((await call(downloadUrl, { headers: stranger })).status, 404);
    assert.equal((await call(endpoint, { headers: stranger })).status, 404);
    assert.equal((await call(endpoint)).status, 404);

    const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.ok(supabase && anon);
    for (const kind of ["public", "authenticated"]) {
      const direct = await fetch(`${supabase}/storage/v1/object/${kind}/${PAYMENT_BUCKET}/${proofPath}`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      });
      assert.ok(!direct.ok, "Anonymous Storage access must be denied.");
    }

    assert.equal((await call(endpoint, { headers: ambassadorHeaders })).status, 200);
    assert.equal((await upload(ambassadorHeaders)).status, 401);
    const verify = (headers: HeadersInit, expectedProofPath: string | null = proofPath, registrationId = own.id) =>
      call(`/api/participants/registrations/${registrationId}/payment`, {
        method: "PUT", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ expectedProofPath }),
      });
    assert.equal((await verify(participant)).status, 401);
    assert.equal((await verify(ambassadorHeaders, proofPath, other.id)).status, 404);
    assert.equal((await verify(ambassadorHeaders, null)).status, 400);
    assert.equal((await verify(ambassadorHeaders)).status, 204);
    assert.equal((await verify(ambassadorHeaders)).status, 204);
    const verified = await prisma.registration.findUniqueOrThrow({ where: { id: own.id } });
    assert.ok(verified.ambassadorVerifiedAt);
    assert.equal(verified.paymentPaid, false);
    assert.equal(verified.paymentDisposition, null);
    assert.equal((await remove({})).status, 401);
    assert.equal((await remove(ambassadorHeaders)).status, 401);
    assert.equal((await remove(stranger)).status, 404);
    const update = (headers: HeadersInit, paid: boolean, expectedProofPath: string | null = proofPath) => call(endpoint, {
      method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ paid, expectedProofPath }),
    });
    assert.equal((await call(endpoint, { headers: executive })).status, 200);
    assert.equal((await update(participant, true)).status, 401);
    assert.equal((await update(ambassadorHeaders, true)).status, 401);
    if (manager) {
      assert.equal((await call(endpoint, { headers: manager })).status, 404);
      assert.equal((await update(manager, true)).status, 403);
    }
    assert.equal((await update(executive, true, null)).status, 409);
    for (const status of ["rejected", "refunded"]) {
      const setDisposition = (headers: HeadersInit): Promise<Response> => call(endpoint, {
        method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status, expectedProofPath: proofPath }),
      });
      assert.equal((await setDisposition(ambassadorHeaders)).status, 401);
      assert.equal((await setDisposition(executive)).status, 200);
      assert.equal((await prisma.registration.findUniqueOrThrow({ where: { id: own.id } })).paymentDisposition, status);
      assert.equal((await verify(ambassadorHeaders)).status, 409);
      assert.equal((await upload(participant)).status, 409);
    }
    assert.equal((await update(executive, true)).status, 200);
    assert.equal((await prisma.registration.findUniqueOrThrow({ where: { id: own.id } })).paymentPaid, true);
    assert.equal((await upload(participant)).status, 409);
    assert.equal((await remove(participant)).status, 409);
    assert.equal((await update(executive, false)).status, 200);
    assert.equal((await upload(participant)).status, 200);
    const replacement = await prisma.registration.findUniqueOrThrow({ where: { id: own.id } });
    assert.ok(!replacement.paymentPaid && replacement.paymentProofPath && replacement.paymentProofPath !== proofPath);
    assert.equal(replacement.ambassadorVerifiedAt, null);
    assert.equal((await verify(ambassadorHeaders)).status, 409);
    assert.equal((await verify(ambassadorHeaders, replacement.paymentProofPath)).status, 204);
    assert.equal((await remove(participant)).status, 409, "A stale removal must not delete a newer screenshot.");
    assert.equal((await remove(participant, replacement.paymentProofPath)).status, 204);
    assert.equal((await prisma.registration.findUniqueOrThrow({ where: { id: own.id } })).ambassadorVerifiedAt, null);
    assert.equal((await call(endpoint, { headers: participant })).status, 404);
    assert.equal((await call(downloadUrl, { headers: executive })).status, 404);
    assert.ok(!(await paymentStorageFetch(`object/authenticated/${PAYMENT_BUCKET}/${replacement.paymentProofPath}`)).ok);
    assert.equal((await remove(participant, replacement.paymentProofPath)).status, 204, "Removal can be retried safely.");
    assert.equal((await upload(participant)).status, 200);

    const deleteRegistration = (id: string, headers?: HeadersInit) =>
      call(`/api/admin/registrations?id=${id}`, { method: "DELETE", headers });
    const finalProof = (await prisma.registration.findUniqueOrThrow({ where: { id: own.id } })).paymentProofPath;
    assert.ok(finalProof);
    assert.equal((await deleteRegistration(own.id)).status, 401);
    assert.equal((await deleteRegistration(own.id, participant)).status, 401);
    if (manager) assert.equal((await deleteRegistration(own.id, manager)).status, 403);
    assert.equal((await deleteRegistration(own.id, executive)).status, 204);
    assert.equal(await prisma.registration.count({ where: { id: own.id } }), 0);
    assert.equal((await call(endpoint, { headers: executive })).status, 404);
    assert.ok(!(await paymentStorageFetch(`object/authenticated/${PAYMENT_BUCKET}/${finalProof}`)).ok);
    assert.equal(await prisma.registration.count({ where: { id: second.id } }), 1);
    const remainingRoster = await (await call("/participants/portal", { headers: participant })).text();
    assert.ok(remainingRoster.includes(secondName) && !remainingRoster.includes(ownName));
    assert.equal((await deleteRegistration(second.id, executive)).status, 204);
    assert.equal((await deleteRegistration(second.id, executive)).status, 404);

    console.log("PASS: payment status, independent ambassador verification, screenshot management, and executive deletion.");
  } finally {
    const where = { id: { in: registrationIds } };
    const proofs = await prisma.registration.findMany({ where, select: { paymentProofPath: true } });
    for (const { paymentProofPath } of proofs) {
      if (paymentProofPath) await removePaymentProof(paymentProofPath);
    }
    await prisma.registration.deleteMany({ where });
    await prisma.participantAccount.deleteMany({ where: { email: { in: [email, otherEmail] } } });
    if (ambassadorId) await prisma.ambassadorApplication.delete({ where: { id: ambassadorId } });
  }
}

main().catch((error: unknown) => {
  const location = error instanceof Error ? error.stack?.split("\n").find((line) => line.includes("verify-participant-portal.ts:")) : undefined;
  console.error("Participant portal verification failed.", error instanceof assert.AssertionError ? error.message : "", location?.trim());
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
