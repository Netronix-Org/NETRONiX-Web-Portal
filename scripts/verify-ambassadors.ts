/** Integration check: pnpm exec tsx scripts/verify-ambassadors.ts [local URL]
 * Uses one explicitly synthetic application and removes only that fixture.
 * Requires the ambassador SQL setup and a running local app.
 */
import assert from "node:assert/strict";
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
  try {
    const invalid = await post({});
    assert.equal(invalid.status, 400);
    assert.equal(Object.keys((await invalid.json()).errors).length, 6);

    const body = { fullName, cnic: "00000-0000000-0", phone: "+92 (000) 000-0000", email: " Synthetic@Example.COM ", university: "Synthetic verification fixture", participantCount: 7 };
    assert.equal((await post(body)).status, 201);
    created = true;
    const saved = await prisma.ambassadorApplication.findUniqueOrThrow({ where: { campaign_cnic: key } });
    assert.equal(saved.participantCount, 7);
    assert.equal(saved.phone, "+920000000000");
    assert.equal(saved.email, "synthetic@example.com");
    assert.equal((await post({ ...body, cnic })).status, 409);

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

    const csv = await fetch(`${base}/api/admin/ambassadors?format=csv`, { headers: auth });
    assert.equal(csv.status, 200);
    const csvText = await csv.text();
    assert.ok(csvText.includes(`"'${fullName}"`), "CSV must neutralize formula prefixes.");
    assert.ok(csvText.includes('"Email"') && csvText.includes('"synthetic@example.com"'));

    const manager = await prisma.adminUser.findFirst({ where: { role: "MANAGER", isActive: true }, select: { id: true, username: true } });
    if (manager) {
      const managerToken = await new SignJWT({ username: manager.username, role: "ADMIN" }).setProtectedHeader({ alg: "HS256" }).setSubject(manager.id).setExpirationTime("2m").sign(new TextEncoder().encode(secret));
      // Even a stale ADMIN claim must not override the current database role.
      assert.equal((await fetch(`${base}/api/admin/ambassadors`, { headers: { Cookie: `netronix_admin_session=${managerToken}` } })).status, 403);
      assert.equal((await fetch(`${base}/api/admin/ambassadors?format=csv`, { headers: { Cookie: `netronix_admin_session=${managerToken}` } })).status, 403);
    }

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
    if (created) {
      const cleanup = await prisma.ambassadorApplication.deleteMany({ where: { ...key, fullName, university: "Synthetic verification fixture" } });
      assert.equal(cleanup.count, 1);
      console.log("Synthetic fixture removed.");
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Ambassador integration check failed:", error instanceof assert.AssertionError ? error.message : "Database or connection failure. No applicant data or credentials logged.");
  process.exitCode = 1;
});
