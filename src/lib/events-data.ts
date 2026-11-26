import "server-only";

/**
 * Server-side event fetching for the public website.
 *
 * Fetches events from the PostgreSQL database via Prisma. If the database is
 * unreachable, the site falls back to the seeded list below so the homepage
 * never breaks. The fallback mirrors the seed data in prisma/seed.ts.
 */

import { prisma } from "@/lib/prisma";
import { cache } from "react";
import type { Event } from "@prisma/client";

const FALLBACK_EVENTS: Event[] = [
  {
    id: "fallback-ugx",
    slug: "ugx",
    title: "UGX — Uber.Game X",
    subtitle: "Annual Gaming Event",
    description:
      "Pakistan's largest university gaming tournament. Featuring CS:GO, FIFA, Valorant, and more across two unforgettable days at GIKI.",
    imageSrc: "/events/UGX_v2.jpeg",
    imagePlaceholder: "UGX",
    accentColor: "#0D0D12",
    status: "coming_soon",
    autoLiveAt: null,
    autoCloseAt: null,
    registrationOpen: true,
    maxRegistrations: null,
    formIntro: null,
    isFeatured: true,
    sortOrder: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "fallback-hnc",
    slug: "hack-n-connect",
    title: "Hack n Connect",
    subtitle: "Hackathon",
    description:
      "A 24-hour hackathon challenging students to build innovative solutions to real-world networking and infrastructure problems.",
    imageSrc: "/events/HNC_v2.jpeg",
    imagePlaceholder: "H&C",
    accentColor: "#0D120D",
    status: "coming_soon",
    autoLiveAt: null,
    autoCloseAt: null,
    registrationOpen: false,
    maxRegistrations: null,
    formIntro: null,
    isFeatured: false,
    sortOrder: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "fallback-inductions",
    slug: "inductions",
    title: "Inductions",
    subtitle: "Society Recruitment",
    description:
      "Join NETRONiX. Open inductions for engineers, developers, event coordinators, and creative minds.",
    imageSrc: "/events/Inductions.jpeg",
    imagePlaceholder: "IND",
    accentColor: "#120D0D",
    status: "live",
    autoLiveAt: null,
    autoCloseAt: null,
    registrationOpen: false,
    maxRegistrations: null,
    formIntro: null,
    isFeatured: false,
    sortOrder: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "fallback-vol",
    slug: "volunteer-call",
    title: "Volunteer Call",
    subtitle: "Open Call",
    description:
      "Help us run the largest events at GIKI. Volunteer for UGX, Hack n Connect, and SNP as crew, logistics, or tech support.",
    imageSrc: "/events/Volcall.jpeg",
    imagePlaceholder: "VOL",
    accentColor: "#0D0D0D",
    status: "coming_soon",
    autoLiveAt: null,
    autoCloseAt: null,
    registrationOpen: false,
    maxRegistrations: null,
    formIntro: null,
    isFeatured: false,
    sortOrder: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "fallback-snp",
    slug: "snp",
    title: "SNP",
    subtitle: "Society Night & Party",
    description:
      "NETRONiX's annual celebration. Live performances, food, and the entire GIKI community together under one roof.",
    imageSrc: "/events/SNP.jpeg",
    imagePlaceholder: "SNP",
    accentColor: "#0A0A0A",
    status: "past",
    autoLiveAt: null,
    autoCloseAt: null,
    registrationOpen: false,
    maxRegistrations: null,
    formIntro: null,
    isFeatured: false,
    sortOrder: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function fetchEvents(): Promise<Event[]> {
  try {
    const events = await prisma.event.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return events.length > 0 ? events : FALLBACK_EVENTS;
  } catch (error) {
    console.error("[events-data] failed to fetch events, using fallback:", error);
    return FALLBACK_EVENTS;
  }
}

// Share the metadata/page lookup within this request; event availability stays live.
export const fetchEventBySlug = cache(async (slug: string): Promise<Event | null> => {
  try {
    return await prisma.event.findUnique({ where: { slug } });
  } catch {
    return FALLBACK_EVENTS.find((e) => e.slug === slug) ?? null;
  }
});

export type { Event as EventRow };
