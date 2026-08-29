/**
 * Event domain logic — shared by the website, the registration form,
 * the API routes and the admin portal.
 */

import type { Event, EventStatus } from "@prisma/client";

/** How the site labels each status. */
export const STATUS_LABEL: Record<EventStatus, string> = {
  live: "Live Now",
  coming_soon: "Coming Soon",
  past: "Concluded",
};

/**
 * Resolve the status actually shown to visitors.
 *
 * Precedence:
 *   1. autoCloseAt has passed  → past
 *   2. manual status is past   → past
 *   3. autoLiveAt has passed   → live
 *   4. otherwise               → the manual status
 */
export function effectiveStatus(
  event: Pick<Event, "status" | "autoLiveAt" | "autoCloseAt">,
  now: Date = new Date()
): EventStatus {
  const close = event.autoCloseAt ? new Date(event.autoCloseAt) : null;
  if (close && now >= close) return "past";

  if (event.status === "past") return "past";

  const live = event.autoLiveAt ? new Date(event.autoLiveAt) : null;
  if (live && now >= live) return "live";

  return event.status;
}

/** Can someone submit the registration form for this event right now? */
export function isRegistrationOpen(
  event: Pick<Event, "status" | "autoLiveAt" | "autoCloseAt" | "registrationOpen">,
  now: Date = new Date()
): boolean {
  const status = effectiveStatus(event, now);
  if (status === "past") return false;
  return event.registrationOpen && (status === "live" || status === "coming_soon");
}

/** Is the event in Pre-Registration mode (Coming Soon + Registrations Open)? */
export function isPreRegistration(
  event: Pick<Event, "status" | "autoLiveAt" | "autoCloseAt" | "registrationOpen">,
  now: Date = new Date()
): boolean {
  return event.registrationOpen && effectiveStatus(event, now) === "coming_soon";
}

/** Button label on the event card based on registration state */
export function getRegisterButtonLabel(
  event: Pick<Event, "status" | "autoLiveAt" | "autoCloseAt" | "registrationOpen">,
  now: Date = new Date()
): string {
  if (isPreRegistration(event, now)) return "Pre-Register →";
  return "Register →";
}

/** Where the event card's button points. */
export function registrationHref(slug: string): string {
  return `/events/${slug}/register`;
}

// ─── Skills catalogue ────────────────────────────────────────────────────────
// The checkbox options on every registration form. Values are stored verbatim
// in registrations.skills, so change `value` only if you are willing to
// migrate existing rows — change `label` freely.

export interface SkillOption {
  value: string;
  label: string;
  group: string;
}

export const SKILL_OPTIONS: SkillOption[] = [
  // Technical
  { value: "networking", label: "Networking / CCNA", group: "Technical" },
  { value: "web-dev", label: "Web Development", group: "Technical" },
  { value: "app-dev", label: "App Development", group: "Technical" },
  { value: "programming", label: "Programming (C++/Python)", group: "Technical" },
  { value: "hardware", label: "Hardware / Electronics", group: "Technical" },
  { value: "cybersecurity", label: "Cybersecurity", group: "Technical" },
  { value: "ai-ml", label: "AI / Machine Learning", group: "Technical" },
  { value: "game-dev", label: "Game Development", group: "Technical" },

  // Creative
  { value: "graphic-design", label: "Graphic Design", group: "Creative" },
  { value: "video-editing", label: "Video Editing", group: "Creative" },
  { value: "photography", label: "Photography", group: "Creative" },
  { value: "ui-ux", label: "UI / UX Design", group: "Creative" },
  { value: "content-writing", label: "Content Writing", group: "Creative" },

  // Operations
  { value: "event-management", label: "Event Management", group: "Operations" },
  { value: "marketing", label: "Marketing / Social Media", group: "Operations" },
  { value: "sponsorships", label: "Sponsorships / Outreach", group: "Operations" },
  { value: "logistics", label: "Logistics", group: "Operations" },
  { value: "public-speaking", label: "Public Speaking / Hosting", group: "Operations" },

  // Escape hatch — pairs with the free-text `otherSkill` column
  { value: "other", label: "Other (tell us below)", group: "Operations" },
];

export const SKILL_VALUES = SKILL_OPTIONS.map((s) => s.value);

/** Grouped for rendering, in a stable order. */
export const SKILL_GROUPS = ["Technical", "Creative", "Operations"] as const;

/** Turn a stored value back into its label, for the admin table. */
export function skillLabel(value: string): string {
  return SKILL_OPTIONS.find((s) => s.value === value)?.label ?? value;
}

// ─── Batches ────────────────────────────────────────────────────────────────
// GIKI batches 36 down to 33, newest first — matches how students read them.

export const BATCH_OPTIONS = [36, 35, 34, 33] as const;
