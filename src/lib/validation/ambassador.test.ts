import assert from "node:assert/strict";
import { test } from "node:test";
import { AmbassadorSchema } from "./ambassador";
import { isAmbassadorCallOpen } from "../ambassadors";

const valid = {
  fullName: "Sample Applicant",
  cnic: "12345-1234567-1",
  phone: "+92 (300) 123-4567",
  email: "sample@example.com",
  university: "Sample University",
  participantCount: 12,
};

test("CNIC and phone normalize consistently for duplicate checks", () => {
  const parsed = AmbassadorSchema.parse(valid);
  assert.equal(parsed.cnic, "1234512345671");
  assert.equal(parsed.phone, "+923001234567");
  assert.equal(AmbassadorSchema.parse({ ...valid, cnic: parsed.cnic }).cnic, parsed.cnic);
});

test("all six ambassador fields are required", () => {
  for (const field of Object.keys(valid)) {
    const incomplete: Record<string, unknown> = { ...valid };
    delete incomplete[field];
    assert.equal(AmbassadorSchema.safeParse(incomplete).success, false, field);
  }
});

test("ambassador email is validated and normalized", () => {
  assert.equal(AmbassadorSchema.parse({ ...valid, email: " Sample@Example.COM " }).email, "sample@example.com");
  for (const email of ["", "invalid", "sample@", "a".repeat(151)]) {
    assert.equal(AmbassadorSchema.safeParse({ ...valid, email }).success, false);
  }
});

test("invalid CNICs, phone numbers and participant counts are rejected", () => {
  for (const cnic of ["1234", "12345-123456-1", "abc1234512345671", "12345 1234567 1"]) {
    assert.equal(AmbassadorSchema.safeParse({ ...valid, cnic }).success, false, cnic);
  }
  for (const phone of ["123", "phone 03001234567", "0300+1234567"]) {
    assert.equal(AmbassadorSchema.safeParse({ ...valid, phone }).success, false, phone);
  }
  for (const participantCount of [0, -1, 1.5, NaN, Infinity, 10001, "12", null]) {
    assert.equal(AmbassadorSchema.safeParse({ ...valid, participantCount }).success, false, String(participantCount));
  }
});

test("names and universities are trimmed; oversized input is rejected", () => {
  assert.equal(AmbassadorSchema.parse({ ...valid, fullName: "  Sample Applicant  " }).fullName, valid.fullName);
  assert.equal(AmbassadorSchema.safeParse({ ...valid, university: " ".repeat(5) }).success, false);
  assert.equal(AmbassadorSchema.safeParse({ ...valid, fullName: "a".repeat(101) }).success, false);
  assert.equal(AmbassadorSchema.safeParse({ ...valid, university: "a".repeat(201) }).success, false);
});

test("the call closes after 13 December in Pakistan time", () => {
  assert.equal(isAmbassadorCallOpen(new Date("2026-12-13T23:59:59+05:00")), true);
  assert.equal(isAmbassadorCallOpen(new Date("2026-12-14T00:00:00+05:00")), false);
});
