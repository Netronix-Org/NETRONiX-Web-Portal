import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EventRegistrationForm } from "./event-registration-form";
import { AmbassadorForm } from "./ambassador-form";
import { EventCard } from "../ui/event-card";

test("both participant forms retain their contact inputs; only UGX requires a game selector", () => {
  for (const slug of ["ugx", "hack-n-connect"]) {
    const html = renderToStaticMarkup(<EventRegistrationForm slug={slug} eventTitle={slug} />);
    const inputs = [...html.matchAll(/<input\b[^>]*>/g)].map(([tag]) => ({ name: /name="([^"]+)"/.exec(tag)?.[1], required: /\brequired=""/.test(tag) }));
    assert.deepEqual(inputs, ["fullName", "phone", "email", "cnic", "city", "ambassador", "university"].map((name, index) => ({ name, required: index < 5 })));
    assert.ok(!html.includes('name="registrationNumber"'));
    assert.ok(!html.includes('name="batch"'));
    if (slug === "ugx") {
      assert.match(html, /<select\b[^>]*required=""[^>]*name="game"/);
      assert.ok(html.includes('<option value="FC26">FC26</option>'));
      assert.ok(html.includes('<option value="Tekken 8">Tekken 8</option>'));
      assert.ok(html.includes('for="participant-game"'));
    } else {
      assert.ok(!html.includes('name="game"'));
    }
  }
});

test("the ambassador form includes a required email field", () => {
  const html = renderToStaticMarkup(<AmbassadorForm />);
  const email = [...html.matchAll(/<input\b[^>]*>/g)].find(([tag]) => tag.includes('name="email"'))?.[0];
  assert.ok(email?.includes('type="email"') && email.includes('required=""'));
});

test("live HNC and UGX cards retain the working registration links", () => {
  for (const slug of ["ugx", "hack-n-connect"]) {
    const href = `/events/${slug}/register`;
    const html = renderToStaticMarkup(<EventCard slug={slug} title={slug} description="Event details" status="live" registerHref={href} />);
    assert.ok(html.includes(`href="${href}"`));
    assert.ok(html.includes("Registration open"));
    assert.ok(html.includes(`/brand/${slug === "ugx" ? "ugx" : "hnc"}.png`));
  }
});

test("paused and concluded event cards do not expose a registration action", () => {
  for (const status of ["live", "past"] as const) {
    const html = renderToStaticMarkup(<EventCard slug="ugx" title="UGX" description="Event details" status={status} />);
    assert.ok(!html.includes('href="/events/ugx/register"'));
    assert.ok(html.includes(status === "past" ? "Concluded" : "Registrations paused"));
  }
});
