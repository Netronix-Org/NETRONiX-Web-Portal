"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminSession } from "@/lib/auth";
import type { Event, EventStatus } from "@prisma/client";
import { EventControls } from "./event-controls";
import { SubmissionsTable } from "./submissions-table";
import { ParticipantSubmissions } from "./participant-submissions";
import { isHncOrUgx } from "@/lib/events";
import { registrationPermission, ROLE_LABELS, type AdminPermissions } from "@/lib/admin-permissions";
import { UsersManager } from "./users-manager";
import { RolePermissions, type EditableRolePermissions } from "./role-permissions";
import { AmbassadorApplications } from "./ambassador-applications";
import { ExecutiveOverviewPanel } from "./executive-overview";
import type { ExecutiveEvent } from "@/lib/admin-executive";
import { Users, Calendar, Inbox, LayoutDashboard, MessageSquare } from "lucide-react";

interface AdminDashboardProps {
  session: AdminSession;
  permissions: AdminPermissions;
  editablePermissions: EditableRolePermissions | null;
  events: Event[];
  counts: Record<string, number>;
  /** Effective status per event id, resolved on the server. */
  statuses: Record<string, EventStatus>;
}

type Tab = "executive" | "events" | "submissions" | "ambassadors" | "team";

export function AdminDashboard({
  session,
  permissions,
  editablePermissions,
  events,
  counts,
  statuses,
}: AdminDashboardProps) {
  const router = useRouter();
  const canViewSubmissions = permissions.hnc || permissions.ugx || permissions.otherRegistrations;
  const availableTabs: Tab[] = [];
  if (session.role === "ADMIN") availableTabs.push("executive");
  if (permissions.events) availableTabs.push("events");
  if (canViewSubmissions) availableTabs.push("submissions");
  if (permissions.ambassadors) availableTabs.push("ambassadors");
  if (editablePermissions) availableTabs.push("team");
  const [requestedTab, setTab] = useState<Tab | undefined>();
  const tab = requestedTab && availableTabs.includes(requestedTab) ? requestedTab : availableTabs[0];
  const submissionEvents = events.filter((event) => permissions[registrationPermission(event.slug)]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    submissionEvents[0]?.id ?? null
  );

  const totalSubmissions = Object.values(counts).reduce((a, b) => a + b, 0);
  const selectedEvent = submissionEvents.find((event) => event.id === selectedEventId) ?? submissionEvents[0];

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  /** Jump straight from an event card to that event's submissions. */
  function viewSubmissions(eventId: string) {
    setSelectedEventId(eventId);
    setTab("submissions");
  }

  function viewExecutiveSubmissions(slug: ExecutiveEvent) {
    const event = submissionEvents.find((event) => event.slug === slug);
    if (event) viewSubmissions(event.id);
  }

  const roleLabel = ROLE_LABELS[session.role] + (session.role === "MANAGER" && session.batch ? ` (Batch ${session.batch})` : "");

  return (
    <main
      className="min-h-screen w-full px-4 md:px-8 py-10"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: "#E11D2E", letterSpacing: "0.12em" }}
              >
                NETRONiX Admin
              </p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                session.role === "ADMIN" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
              }`}>
                {roleLabel}
              </span>
            </div>
            <h1
              className="font-heading font-semibold"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", letterSpacing: "-0.03em" }}
            >
              Portal
            </h1>
            <p className="text-sm" style={{ color: "#666666" }}>
              Signed in as {session.displayName ?? session.username} ·{" "}
              {events.length} events · {totalSubmissions} submissions
            </p>
          </div>

          <button
            onClick={logout}
            className="py-2.5 px-5 rounded-lg text-sm font-medium border transition-colors hover:bg-white/[0.03] cursor-pointer"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "#B3B3B3" }}
          >
            Sign out
          </button>
        </header>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div
          className="flex flex-wrap gap-1 p-1 rounded-xl border w-fit"
          style={{ backgroundColor: "#141414", borderColor: "rgba(255,255,255,0.08)" }}
        >
          {session.role === "ADMIN" && (
            <button
              type="button"
              aria-pressed={tab === "executive"}
              onClick={() => setTab("executive")}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 font-mono text-xs font-medium transition-colors"
              style={{
                backgroundColor: tab === "executive" ? "rgba(225,29,46,0.15)" : "transparent",
                color: tab === "executive" ? "#FFFFFF" : "#888888",
              }}
            >
              <LayoutDashboard className="size-3.5" aria-hidden="true" />
              Executive dashboard
            </button>
          )}

          {permissions.events && <button
            onClick={() => setTab("events")}
            className="py-2 px-4 rounded-lg text-xs font-mono font-medium transition-colors inline-flex items-center gap-2 cursor-pointer"
            style={{
              backgroundColor:
                tab === "events" ? "rgba(225,29,46,0.15)" : "transparent",
              color: tab === "events" ? "#FFFFFF" : "#888888",
            }}
          >
            <Calendar className="w-3.5 h-3.5" />
            Events
          </button>}

          {canViewSubmissions && <button
            onClick={() => setTab("submissions")}
            className="py-2 px-4 rounded-lg text-xs font-mono font-medium transition-colors inline-flex items-center gap-2 cursor-pointer"
            style={{
              backgroundColor:
                tab === "submissions" ? "rgba(225,29,46,0.15)" : "transparent",
              color: tab === "submissions" ? "#FFFFFF" : "#888888",
            }}
          >
            <Inbox className="w-3.5 h-3.5" />
            Submissions ({totalSubmissions})
          </button>}

          {permissions.ambassadors && (
            <button
              onClick={() => setTab("ambassadors")}
              className="py-2 px-4 rounded-lg text-xs font-mono font-medium transition-colors inline-flex items-center gap-2 cursor-pointer"
              style={{
                backgroundColor: tab === "ambassadors" ? "rgba(225,29,46,0.15)" : "transparent",
                color: tab === "ambassadors" ? "#FFFFFF" : "#888888",
              }}
            >
              <Users className="w-3.5 h-3.5" />
              Ambassadors
            </button>
          )}

          {editablePermissions && (
            <button
              onClick={() => setTab("team")}
              className="py-2 px-4 rounded-lg text-xs font-mono font-medium transition-colors inline-flex items-center gap-2 cursor-pointer"
              style={{
                backgroundColor:
                  tab === "team" ? "rgba(225,29,46,0.15)" : "transparent",
                color: tab === "team" ? "#FFFFFF" : "#888888",
              }}
            >
              <Users className="w-3.5 h-3.5" />
              Team & Permissions
            </button>
          )}

          {permissions.complaints && <button
            onClick={() => router.push("/admin/complaints")}
            className="py-2 px-4 rounded-lg text-xs font-mono font-medium transition-colors inline-flex items-center gap-2 cursor-pointer text-neutral-400 hover:text-white"
          >
            <MessageSquare className="w-3.5 h-3.5 text-red-500" />
            Complaints Desk ↗
          </button>}
        </div>
        {!tab && !permissions.complaints && <p className="text-sm text-neutral-400">Your role currently has no access to portal sections.</p>}

        {tab === "executive" && <ExecutiveOverviewPanel onViewSubmissions={viewExecutiveSubmissions} />}

        {/* ── Events tab ──────────────────────────────────────────────────── */}
        {tab === "events" && (
          <section className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: "#666666" }}>
              Tick an event live and its card on the website turns into a
              working Register button. Set a go-live date instead and it flips
              on its own at that moment.
            </p>

            {events.length === 0 ? (
              <div
                className="rounded-2xl border p-8 text-sm"
                style={{
                  backgroundColor: "#141414",
                  borderColor: "rgba(255,255,255,0.08)",
                  color: "#B3B3B3",
                }}
              >
                No events yet.
              </div>
            ) : (
              events.map((event) => {
                const canViewEvent = permissions[registrationPermission(event.slug)];
                return (
                  <EventControls
                    key={event.id}
                    event={event}
                    shown={statuses[event.id] ?? event.status}
                    submissionCount={canViewEvent ? counts[event.id] ?? 0 : undefined}
                    onViewSubmissions={canViewEvent ? () => viewSubmissions(event.id) : undefined}
                  />
                );
              })
            )}
          </section>
        )}

        {/* ── Submissions tab ─────────────────────────────────────────────── */}
        {tab === "submissions" && (
          <section className="flex flex-col gap-5">
            {/* Event picker — submissions are always scoped to exactly one
                event, so there is never any doubt whose rows these are. */}
            <div className="flex flex-wrap gap-2">
              {submissionEvents.map((event) => {
                const active = event.id === selectedEvent?.id;
                return (
                  <button
                    key={event.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedEventId(event.id)}
                    className="py-2 px-4 rounded-lg text-sm font-medium border transition-colors hover:bg-white/[0.03]"
                    style={{
                      backgroundColor: active
                        ? "rgba(225,29,46,0.15)"
                        : "#141414",
                      borderColor: active
                        ? "rgba(225,29,46,0.5)"
                        : "rgba(255,255,255,0.08)",
                      color: active ? "#FFFFFF" : "#B3B3B3",
                    }}
                  >
                    {event.title}
                    <span className="ml-2" style={{ color: "#666666" }}>
                      {counts[event.id] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedEvent && isHncOrUgx(selectedEvent.slug) ? (
              <ParticipantSubmissions
                key={selectedEvent.id}
                canReviewPayments={session.role === "ADMIN"}
                canViewScreenshots={permissions.paymentScreenshots}
                eventId={selectedEvent.id}
                eventSlug={selectedEvent.slug}
                eventTitle={selectedEvent.title}
              />
            ) : selectedEvent ? (
              <SubmissionsTable
                key={selectedEvent.id}
                eventId={selectedEvent.id}
                eventTitle={selectedEvent.title}
              />
            ) : (
              <p className="text-sm" style={{ color: "#666666" }}>
                Select an event to see its submissions.
              </p>
            )}
          </section>
        )}

        {tab === "ambassadors" && <AmbassadorApplications canRevealPasswords={session.role === "ADMIN"} />}

        {/* ── Team & Junior Accounts tab ──────────────────────────────────── */}
        {tab === "team" && editablePermissions && (
          <section className="flex flex-col gap-5">
            <RolePermissions initial={editablePermissions} />
            <UsersManager session={session} />
          </section>
        )}
      </div>
    </main>
  );
}
