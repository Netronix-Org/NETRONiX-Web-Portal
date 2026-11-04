/** Integration check: pnpm exec tsx scripts/verify-ambassadors.ts [local URL]
 * Uses one explicitly synthetic application and removes only that fixture.
 * Requires the ambassador SQL setup and a running local app.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { prisma } from "../src/lib/prisma";
import { AMBASSADOR_CAMPAIGN } from "../src/lib/ambassadors";

async function main() {
  const base = process.argv[2] || "http://127.0.0.1:3000";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use a local app for this check.");
  const cnic = "0000000000000";
  const fullName = "=SYNTHETIC AMBASSADOR CHECK";
  const key = { campaign: AMBASSADOR_CAMPAIGN.id, cnic };
  assert.equal(await prisma.ambassadorApplication.count({ where: key }), 0, "Fixture CNIC already exists; refusing to touch it.");

  const testIp = `198.18.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  const headers = { "Content-Type": "application/json", "X-Forwarded-For": testIp };
  const post = (body: unknown) => fetch(`${base}/api/ambassadors`, { method: "POST", headers, body: JSON.stringify(body) });
  let created = false;
  const fixtureRegistrationIds: string[] = [];
  try {
    const invalid = await post({});
    assert.equal(invalid.status, 400);
    assert.equal(Object.keys((await invalid.json()).errors).length, 6);

    const body = { fullName, cnic: "00000-0000000-0", phone: "+92 (000) 000-0000", email: " Synthetic@Example.COM ", university: "Synthetic verification fixture", participantCount: 7 };
    const response = await post(body);
    assert.equal(response.status, 201);
    created = true;
    const { code, password } = await response.json();
    assert.match(String(code), /^[1-9]\d{3}$/);
    assert.match(password, /^[A-Za-z0-9_-]{8}$/);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const saved = await prisma.ambassadorApplication.findUniqueOrThrow({ where: { campaign_cnic: key } });
    assert.equal(saved.code, code);
    assert.equal(saved.participantCount, 7);
    assert.equal(saved.phone, "+920000000000");
    assert.equal(saved.email, "synthetic@example.com");
    assert.equal((await post({ ...body, cnic })).status, 409);
    assert.equal((await post({ ...body, cnic: "0000000000072" })).status, 409);

    assert.equal((await fetch(`${base}/api/admin/ambassadors`)).status, 401);
    assert.equal((await fetch(`${base}/api/admin/ambassadors?format=csv`)).status, 401);

    const secret = process.env.ADMIN_SESSION_SECRET;
    assert.ok(secret, "ADMIN_SESSION_SECRET is required.");
    const admin = await prisma.adminUser.findFirstOrThrow({ where: { role: "ADMIN", isActive: true }, select: { id: true, username: true } });
    const token = await new SignJWT({ username: admin.username, role: "ADMIN" }).setProtectedHeader({ alg: "HS256" }).setSubject(admin.id).setExpirationTime("2m").sign(new TextEncoder().encode(secret));
    const auth = { Cookie: `netronix_admin_session=${token}` };
    const list = await fetch(`${base}/api/admin/ambassadors`, { headers: auth });
    assert.equal(list.status, 200);
    assert.equal(list.headers.get("cache-control"), "private, no-store");
    const data = await list.json();
    assert.ok(data.applications.some((a: { id: string }) => a.id === saved.id));
    assert.equal(data.applications.find((a: { id: string }) => a.id === saved.id).email, "synthetic@example.com");
    assert.equal(data.applications.find((a: { id: string }) => a.id === saved.id).code, code);
    const entry = data.applications.find((a: { id: string }) => a.id === saved.id);
    assert.equal(entry.passwordIssued, true);
    for (const field of ["password", "passwordHash", "issuedPassword"]) assert.ok(!(field in entry));

    const credentialsUrl = `${base}/api/admin/ambassadors/${saved.id}/credentials`;
    assert.equal((await fetch(credentialsUrl)).status, 401);
    const credentials = await fetch(credentialsUrl, { headers: auth });
    assert.equal(credentials.status, 200);
    assert.equal(credentials.headers.get("cache-control"), "private, no-store");
    assert.ok((await credentials.json()).password === password, "Executive admins can retrieve the issued password.");

    const csv = await fetch(`${base}/api/admin/ambassadors?format=csv`, { headers: auth });
    assert.equal(csv.status, 200);
    const csvText = await csv.text();
    assert.ok(csvText.includes(`"'${fullName}"`), "CSV must neutralize formula prefixes.");
    assert.ok(csvText.includes('"Email"') && csvText.includes('"synthetic@example.com"'));
    assert.ok(csvText.includes('"Ambassador Code"') && csvText.includes(`"${code}"`));

    const manager = await prisma.adminUser.findFirst({ where: { role: "MANAGER", isActive: true }, select: { id: true, username: true } });
    if (manager) {
      const managerToken = await new SignJWT({ username: manager.username, role: "ADMIN" }).setProtectedHeader({ alg: "HS256" }).setSubject(manager.id).setExpirationTime("2m").sign(new TextEncoder().encode(secret));
      // Even a stale ADMIN claim must not override the current database role.
      assert.equal((await fetch(`${base}/api/admin/ambassadors`, { headers: { Cookie: `netronix_admin_session=${managerToken}` } })).status, 403);
      assert.equal((await fetch(`${base}/api/admin/ambassadors?format=csv`, { headers: { Cookie: `netronix_admin_session=${managerToken}` } })).status, 403);
      assert.equal((await fetch(credentialsUrl, { headers: { Cookie: `netronix_admin_session=${managerToken}` } })).status, 403);
    }

    const portalUrl = `${base}/ambassadors/portal`;
    const sessionUrl = `${base}/api/ambassadors/session`;
    const login = (value: string) => fetch(sessionUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: " Synthetic@Example.COM ", password: value }),
    });
    assert.equal((await login("!!!!!!!!")).status, 401);
    const session = await login(password);
    assert.equal(session.status, 200);
    const sessionCookie = session.headers.get("set-cookie");
    assert.ok(sessionCookie?.includes("HttpOnly"));
    assert.ok(sessionCookie?.startsWith("netronix_ambassador_session="));
    const ambassadorAuth = { Cookie: sessionCookie!.split(";")[0] };
    assert.equal((await fetch(credentialsUrl, { headers: ambassadorAuth })).status, 401);

    const marker = randomUUID();
    const ownName = `Synthetic own referral ${marker}`;
    const otherName = `Synthetic other referral ${marker}`;
    const hnc = await prisma.event.findUniqueOrThrow({ where: { slug: "hack-n-connect" }, select: { id: true } });
    const referrals = await prisma.registration.createManyAndReturn({
      data: [
        { fullName: ownName, cnic: "0000000000073", formData: { ambassadorCode: String(code), socials: "No" } },
        { fullName: otherName, cnic: "0000000000074", formData: { ambassadorCode: "0000" } },
      ].map((referral) => ({
        ...referral, eventId: hnc.id, email: "synthetic-referral@example.invalid", phone: "00000000000", skills: [],
      })),
      select: { id: true },
    });
    fixtureRegistrationIds.push(...referrals.map(({ id }) => id));

    const portal = await fetch(portalUrl, { headers: ambassadorAuth });
    assert.equal(portal.status, 200);
    // Next's development server uses no-cache. Production uses private, no-store.
    assert.match(portal.headers.get("cache-control") ?? "", /\b(?:no-store|no-cache)\b/);
    const roster = await portal.text();
    assert.ok(roster.includes(ownName));
    assert.ok(!roster.includes(otherName));
    assert.ok(roster.includes("Ending in 0073") && !roster.includes("0000000000073"));
    assert.ok(!(await (await fetch(portalUrl)).text()).includes(ownName));
    const signOut = await fetch(sessionUrl, { method: "DELETE", headers: ambassadorAuth });
    assert.equal(signOut.status, 204);
    assert.ok(signOut.headers.get("set-cookie")?.startsWith("netronix_ambassador_session=;"));
    console.log("PASS: credential issuance, executive reveal, ambassador sign-in, referral isolation, CNIC masking and sign-out.");

    for (let index = 0; index < 2; index++) await post({});
    const limited = await post({});
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);

    const [privacy] = await prisma.$queryRaw<Array<{ rls: boolean; anon_read: boolean; authenticated_read: boolean }>>`
      SELECT c.relrowsecurity AS rls,
        has_table_privilege('anon', 'public.ambassador_applications', 'SELECT') AS anon_read,
        has_table_privilege('authenticated', 'public.ambassador_applications', 'SELECT') AS authenticated_read
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'ambassador_applications'
    `;
    assert.deepEqual(privacy, { rls: true, anon_read: false, authenticated_read: false });
    console.log("PASS: persistence, normalization, duplicate protection, validation, admin authentication, CSV escaping, rate limiting and database privacy.");
    console.log(manager ? "PASS: current manager role cannot read or export applications." : "SKIP: no active manager account available for the 403 check.");
  } finally {
    if (fixtureRegistrationIds.length) {
      await prisma.registration.deleteMany({ where: { id: { in: fixtureRegistrationIds } } });
    }
    if (created) {
      const cleanup = await prisma.ambassadorApplication.deleteMany({ where: { ...key, fullName, university: "Synthetic verification fixture" } });
      assert.equal(cleanup.count, 1);
      console.log("Synthetic fixture removed.");
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  const location = error instanceof Error
    ? error.stack?.split("\n").find((line) => line.includes("verify-ambassadors.ts:"))?.trim()
    : undefined;
  console.error("Ambassador integration check failed.", location ?? "No applicant data or credentials logged.");
  process.exitCode = 1;
});
