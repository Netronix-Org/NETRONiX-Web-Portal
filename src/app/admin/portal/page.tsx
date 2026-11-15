import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/dashboard";
import { effectiveStatus } from "@/lib/events";
import { accessibleRegistrationEvents, getAdminPermissions } from "@/lib/admin-permissions.server";
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

  const permissions = await getAdminPermissions(session.role);
  const registrationEvents = accessibleRegistrationEvents(permissions);
  const [events, counts, juniorPermissions, liaisonPermissions] = await Promise.all([
    prisma.event.findMany({
      where: permissions.events ? undefined : registrationEvents,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.registration.groupBy({
      by: ["eventId"],
      where: { event: registrationEvents },
      _count: true,
    }),
    session.role === "ADMIN" ? getAdminPermissions("MANAGER") : null,
    session.role === "ADMIN" ? getAdminPermissions("LIAISON") : null,
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
      permissions={permissions}
      editablePermissions={juniorPermissions && liaisonPermissions ? { MANAGER: juniorPermissions, LIAISON: liaisonPermissions } : null}
      events={events}
      counts={Object.fromEntries(countByEvent)}
      statuses={statuses}
    />
  );
}
