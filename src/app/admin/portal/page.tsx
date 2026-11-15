import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/dashboard";
import { effectiveStatus } from "@/lib/events";
import { PARTICIPANT_EVENT_SLUGS } from "@/lib/participants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Portal — NETRONiX Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPortalPage() {
  // proxy.ts already gated this route; this is the server-side belt-and-braces.
  const session = await getSession();
  if (!session) redirect("/admin/login?next=/admin/portal");

  const [events, counts] = await Promise.all([
    prisma.event.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.registration.groupBy({
      by: ["eventId"],
      where: session.role === "ADMIN" ? undefined : { event: { slug: { notIn: PARTICIPANT_EVENT_SLUGS } } },
      _count: true,
    }),
  ]);

  // Roll the submission counts up per event.
  const countByEvent = new Map<string, number>();
  for (const row of counts) {
    countByEvent.set(row.eventId, row._count);
  }

  // Resolve each event's status here, against the server clock, so the client
  // components stay pure and server and client cannot disagree.
  const now = new Date();
  const statuses = Object.fromEntries(
    events.map((event) => [event.id, effectiveStatus(event, now)])
  );

  return (
    <AdminDashboard
      session={session}
      events={events}
      counts={Object.fromEntries(countByEvent)}
      statuses={statuses}
    />
  );
}
