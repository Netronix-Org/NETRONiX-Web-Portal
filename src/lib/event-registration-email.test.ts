import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { registrationEmailContent, sendRegistrationConfirmation, type RegistrationEmail } from "./event-registration-email";

const registration: RegistrationEmail = {
  id: "7d50cf42-f5b4-4cc0-a98a-f9354ee3becb", to: "participant@example.invalid",
  fullName: "Sample Participant", slug: "ugx", eventTitle: "UGX — Uber.Game X",
  phone: "03001234567", cnic: "0000012345678", city: "Islamabad",
  ambassador: "Sample Ambassador", university: "Sample University",
  transport: "yes",
  portalPassword: "EXAMPLE1",
  isPreRegistration: false, game: "FC26",
};
const keys = ["BREVO_API_KEY", "BREVO_SENDER_EMAIL", "BREVO_SENDER_NAME"] as const;
let env: (string | undefined)[];
beforeEach(() => {
  env = keys.map((key) => process.env[key]);
  process.env.BREVO_API_KEY = "synthetic-key";
  process.env.BREVO_SENDER_EMAIL = "events@example.invalid";
  process.env.BREVO_SENDER_NAME = "NETRONiX Events";
});
afterEach(() => {
  mock.restoreAll();
  keys.forEach((key, index) => { if (env[index] === undefined) delete process.env[key]; else process.env[key] = env[index]; });
});

test("confirmation contains every submitted field, event, game, dates and reference, with payment details deferred", () => {
  const content = registrationEmailContent(registration);
  for (const value of ["UGX", "FC26", "11–13 December 2026", "GIKI", registration.id, "Payment instructions will follow"]) assert.ok(content.textContent.includes(value));
  for (const value of [registration.fullName, registration.phone, registration.to, registration.cnic, registration.city, registration.ambassador!, registration.university!]) {
    assert.ok(content.textContent.includes(value));
    assert.ok(content.htmlContent.includes(value));
  }
  assert.ok(!content.subject.includes("[TEST]"));
  const hnc = registrationEmailContent({ ...registration, slug: "hack-n-connect", isPreRegistration: true });
  assert.ok(hnc.subject.startsWith("Pre-registration received"));
  assert.ok(!hnc.textContent.includes("Game:"));
  assert.ok(content.textContent.includes("Transport: Yes"));
  assert.ok(registrationEmailContent({ ...registration, transport: "no" }).textContent.includes("Transport: No"));
  assert.ok(content.textContent.includes("transport is available from Islamabad, Peshawar and Haripur only."));
});

test("HTML escapes participant names and event titles; test emails cannot look like real confirmations", () => {
  const content = registrationEmailContent({ ...registration, fullName: '<img src=x onerror="alert(1)">', eventTitle: "HNC & UGX <event>", isTest: true });
  assert.equal((content.htmlContent.match(/<img\b/g) || []).length, 2);
  assert.ok(!content.htmlContent.includes('<img src=x'));
  assert.ok(content.htmlContent.includes("&lt;img"));
  assert.ok(content.htmlContent.includes("HNC &amp; UGX &lt;event&gt;"));
  assert.ok(content.subject.startsWith("[TEST]"));
  assert.ok(content.textContent.includes("No event registration has been created."));
});

test("both official logos lead each email and blank optional fields are explicit", () => {
  for (const slug of ["ugx", "hack-n-connect"] as const) {
    const content = registrationEmailContent({ ...registration, slug, ambassador: " ", university: undefined });
    const eventLogo = `https://www.netronixgiki.com/brand/${slug === "ugx" ? "ugx" : "hnc"}.png`;
    assert.ok(content.htmlContent.includes('src="https://www.netronixgiki.com/brand/netronix-white.png"'));
    assert.ok(content.htmlContent.includes(`src="${eventLogo}"`));
    assert.ok(content.htmlContent.indexOf(eventLogo) < content.htmlContent.indexOf("<h1"));
    assert.ok(content.textContent.includes("Ambassador: Not provided"));
    assert.ok(content.textContent.includes("University: Not provided"));
    const portalUrl = "https://www.netronixgiki.com/participants/portal";
    assert.ok(content.textContent.includes(`Participant portal: ${portalUrl}`));
    assert.ok(content.textContent.includes(`Portal password: ${registration.portalPassword}`));
    assert.ok(content.htmlContent.includes(`href="${portalUrl}"`));
    assert.ok(content.htmlContent.includes(`<strong>${registration.portalPassword}</strong>`));
  }
});

test("all free-text registration fields are escaped in HTML", () => {
  const content = registrationEmailContent({ ...registration, city: '<city & "test">', ambassador: "<ambassador>", university: "<university>" });
  assert.ok(content.htmlContent.includes("&lt;city &amp; &quot;test&quot;&gt;"));
  assert.ok(content.htmlContent.includes("&lt;ambassador&gt;"));
  assert.ok(content.htmlContent.includes("&lt;university&gt;"));
});

test("missing configuration never attempts a provider request", async () => {
  const request = mock.method(globalThis, "fetch", async () => { throw new Error("Must not be called"); });
  delete process.env.BREVO_API_KEY;
  assert.deepEqual(await sendRegistrationConfirmation(registration), { success: false, reason: "not_configured" });
  process.env.BREVO_API_KEY = "synthetic-key";
  delete process.env.BREVO_SENDER_EMAIL;
  assert.deepEqual(await sendRegistrationConfirmation(registration), { success: false, reason: "not_configured" });
  assert.equal(request.mock.callCount(), 0);
});

test("sends one authenticated Brevo request with stable idempotency and all submitted details", async () => {
  const request = mock.method(globalThis, "fetch", async (url: Parameters<typeof fetch>[0], options?: RequestInit) => {
    assert.ok(options);
    assert.equal(url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(options.method, "POST");
    assert.equal(new Headers(options.headers).get("api-key"), "synthetic-key");
    assert.ok(options.signal instanceof AbortSignal);
    const body = String(options.body);
    const payload = JSON.parse(body);
    assert.deepEqual(payload.sender, { email: "events@example.invalid", name: "NETRONiX Events" });
    assert.deepEqual(payload.to, [{ email: registration.to, name: registration.fullName }]);
    assert.equal(payload.headers.IdempotencyKey, registration.id);
    for (const value of [registration.cnic, registration.phone, registration.city, registration.university!, registration.ambassador!]) assert.ok(payload.textContent.includes(value));
    assert.ok(!body.includes("synthetic-key"));
    return Response.json({ messageId: "test-message" }, { status: 201 });
  });
  assert.deepEqual(await sendRegistrationConfirmation(registration), { success: true, messageId: "test-message" });
  assert.equal(request.mock.callCount(), 1);
});

test("provider rejection, invalid acknowledgement and network errors return failure without leaking their bodies", async () => {
  const errors: unknown[][] = [];
  mock.method(console, "error", (...args: unknown[]) => { errors.push(args); });
  const request = mock.method(globalThis, "fetch", async () => Response.json({ message: "SENSITIVE_PROVIDER_BODY" }, { status: 429 }));
  assert.deepEqual(await sendRegistrationConfirmation(registration), { success: false, reason: "provider_rejected" });
  request.mock.mockImplementation(async () => Response.json({}));
  assert.deepEqual(await sendRegistrationConfirmation(registration), { success: false, reason: "provider_rejected" });
  request.mock.mockImplementation(async () => { throw new Error("SENSITIVE_PROVIDER_BODY"); });
  assert.deepEqual(await sendRegistrationConfirmation(registration), { success: false, reason: "connection_failed" });
  assert.ok(!JSON.stringify(errors).includes("SENSITIVE_PROVIDER_BODY"));
});
