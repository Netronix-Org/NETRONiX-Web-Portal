import assert from "node:assert/strict";
import { test } from "node:test";
import { isRegistrationOpen, isPreRegistration } from "./events";

const live = { status: "live" as const, autoLiveAt: null, autoCloseAt: null, registrationOpen: true };

test("a live event accepts registrations when its registration switch is enabled", () => {
  assert.equal(isRegistrationOpen(live), true);
  assert.equal(isPreRegistration(live), false);
});

test("an intentional registration pause is honored even while an event is live", () => {
  assert.equal(isRegistrationOpen({ ...live, registrationOpen: false }), false);
});

test("concluded events stay closed even if the registration switch is enabled", () => {
  assert.equal(isRegistrationOpen({ ...live, status: "past" }), false);
  assert.equal(isRegistrationOpen({ ...live, autoCloseAt: new Date("2026-10-01T00:00:00+05:00") }, new Date("2026-10-30T12:00:00+05:00")), false);
});

test("coming-soon events can accept pre-registrations using the same switch", () => {
  const upcoming = { ...live, status: "coming_soon" as const };
  assert.equal(isRegistrationOpen(upcoming), true);
  assert.equal(isPreRegistration(upcoming), true);
  assert.equal(isRegistrationOpen({ ...upcoming, registrationOpen: false }), false);
});
