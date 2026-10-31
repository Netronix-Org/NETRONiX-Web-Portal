import assert from "node:assert/strict";
import { test } from "node:test";
import { EventRegistrationSchema, getEventRegistrationSchema, getUgxGame, UGX_GAMES } from "./event-registration";
import { RegistrationSchema } from "./registration";
import { VolunteerRegistrationSchema } from "./volunteer-registration";
import { isHncOrUgx } from "../events";

const required = {
  fullName: "Sample Participant",
  phone: "0300 1234567",
  email: " Sample@Example.COM ",
  cnic: "12345-1234567-1",
  city: " Islamabad ",
};

test("shared contact fields are normalized", () => {
  const data = EventRegistrationSchema.parse(required);
  assert.equal(data.email, "sample@example.com");
  assert.equal(data.phone, "03001234567");
  assert.equal(data.cnic, "1234512345671");
  assert.equal(data.city, "Islamabad");
  assert.equal(data.ambassador, undefined);
  assert.equal(data.university, undefined);
});

test("UGX requires one of the two games; HNC does not require a game", () => {
  const ugx = getEventRegistrationSchema("ugx");
  const empty = ugx.safeParse({});
  assert.equal(empty.success, false);
  if (!empty.success) assert.ok(empty.error.flatten().fieldErrors.game);
  assert.equal(getEventRegistrationSchema("hack-n-connect").safeParse(required).success, true);
  for (const game of UGX_GAMES) {
    assert.equal(ugx.parse({ ...required, game }).game, game);
    assert.equal(getUgxGame({ game }), game);
  }
  for (const game of [undefined, "", "Other", ["FC26", "Tekken 8"]]) {
    const result = ugx.safeParse({ ...required, game });
    assert.equal(result.success, false);
    if (!result.success) assert.ok(result.error.flatten().fieldErrors.game);
  }
  for (const formData of [null, {}, { game: "Other" }]) assert.equal(getUgxGame(formData), null);
});

test("ambassador and university can be omitted, blank or supplied", () => {
  for (const extra of [{}, { ambassador: "", university: "" }, { ambassador: "  Sample Ambassador  ", university: "  Sample University  " }]) {
    assert.equal(EventRegistrationSchema.safeParse({ ...required, ...extra }).success, true);
  }
  const data = EventRegistrationSchema.parse({ ...required, ambassador: " Sample Ambassador ", university: " Sample University " });
  assert.equal(data.ambassador, "Sample Ambassador");
  assert.equal(data.university, "Sample University");
});

test("each participant field is required; invalid contact details are rejected", () => {
  for (const field of Object.keys(required)) {
    const incomplete: Record<string, unknown> = { ...required };
    delete incomplete[field];
    assert.equal(EventRegistrationSchema.safeParse(incomplete).success, false, field);
    assert.equal(EventRegistrationSchema.safeParse({ ...required, [field]: " " }).success, false, field);
  }
  for (const invalid of [{ email: "invalid" }, { cnic: "1234" }, { phone: "012" }, { city: "x".repeat(101) }, { ambassador: "x".repeat(101) }, { university: "x".repeat(201) }]) {
    assert.equal(EventRegistrationSchema.safeParse({ ...required, ...invalid }).success, false);
  }
});

test("only HNC and UGX use this form; recruitment retains its requirements", () => {
  assert.equal(isHncOrUgx("ugx"), true);
  assert.equal(isHncOrUgx("hack-n-connect"), true);
  for (const slug of ["volunteer-call", "inductions", "snp"]) assert.equal(isHncOrUgx(slug), false);
  assert.equal(RegistrationSchema.safeParse(required).success, false);
  assert.equal(VolunteerRegistrationSchema.safeParse(required).success, false);
});
