"use client";

import { useCallback, useEffect, useState } from "react";
import type { Registration, RegistrationStatus } from "@prisma/client";
import { skillLabel } from "@/lib/events";

const STATUS_OPTIONS: RegistrationStatus[] = [
  "pending",
  "confirmed",
  "waitlisted",
  "rejected",
];

const STATUS_COLOR: Record<RegistrationStatus, string> = {
  pending: "#B3B3B3",
  confirmed: "#4ADE80",
  waitlisted: "#FBBF24",
  rejected: "#E11D2E",
};

interface SubmissionsTableProps {
  eventId: string;
  eventTitle: string;
}

export function SubmissionsTable({ eventId, eventTitle }: SubmissionsTableProps) {
  const [rows, setRows] = useState<Registration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ eventId, page: String(page) });
        if (query.trim()) params.set("q", query.trim());

        const res = await fetch(`/api/admin/registrations?${params}`, { signal });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          setError(payload?.message ?? "Could not load submissions.");
          return;
        }

        const payload = await res.json();
        setRows(payload.registrations);
        setTotal(payload.total);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setError("Could not reach the server.");
        }
      } finally {
        setLoading(false);
      }
    },
    [eventId, page, query]
  );

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => load(controller.signal), 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  async function updateStatus(id: string, status: RegistrationStatus) {
    // Optimistic — the row flips immediately, and reverts if the save fails.
    const previous = rows;
    setRows((current) =>
      current.map((r) => (r.id === id ? { ...r, status } : r))
    );

    const res = await fetch("/api/admin/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (!res.ok) {
      setRows(previous);
      setError("Could not update that submission.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setPage(0);
            setQuery(e.target.value);
          }}
          placeholder="Search name, reg number or email"
          className="rounded-lg border px-4 py-2.5 text-sm outline-none w-full sm:w-80 placeholder:text-[#555555]"
          style={{
            backgroundColor: "#0F0F0F",
            borderColor: "rgba(255,255,255,0.1)",
            color: "#FFFFFF",
          }}
        />

        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "#666666" }}>
            {total} total
          </span>

          <a
            href={`/api/admin/registrations/export?eventId=${eventId}`}
            className="py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors hover:bg-white/[0.03]"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "#B3B3B3" }}
          >
            Export CSV
          </a>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm" style={{ color: "#E11D2E" }}>
          {error}
        </p>
      )}

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border overflow-x-auto"
        style={{ backgroundColor: "#141414", borderColor: "rgba(255,255,255,0.08)" }}
      >
        {loading && rows.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "#666666" }}>
            Loading submissions...
          </p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "#666666" }}>
            No submissions for {eventTitle} yet.
          </p>
        ) : (
          <table className="w-full text-sm border-collapse min-w-[880px]">
            <thead>
              <tr
                className="text-left"
                style={{ color: "#666666", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <th className="font-mono text-xs uppercase tracking-widest px-4 py-3 font-normal">Name</th>
                <th className="font-mono text-xs uppercase tracking-widest px-4 py-3 font-normal">Reg #</th>
                <th className="font-mono text-xs uppercase tracking-widest px-4 py-3 font-normal">Batch</th>
                <th className="font-mono text-xs uppercase tracking-widest px-4 py-3 font-normal">Contact</th>
                <th className="font-mono text-xs uppercase tracking-widest px-4 py-3 font-normal">Hostel</th>
                <th className="font-mono text-xs uppercase tracking-widest px-4 py-3 font-normal">Skills</th>
                <th className="font-mono text-xs uppercase tracking-widest px-4 py-3 font-normal">Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((reg) => {
                const open = expanded === reg.id;

                return [
                  <tr
                    key={reg.id}
                    onClick={() => setExpanded(open ? null : reg.id)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <td className="px-4 py-3" style={{ color: "#FFFFFF" }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{reg.fullName}</span>
                        {reg.isPreRegistration && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border"
                            style={{
                              color: "#38BDF8",
                              backgroundColor: "rgba(56,189,248,0.12)",
                              borderColor: "rgba(56,189,248,0.3)",
                            }}
                          >
                            Pre-Reg
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "#B3B3B3" }}>
                      {reg.registrationNumber}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#B3B3B3" }}>
                      {reg.batch}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#B3B3B3" }}>
                      <span className="block">{reg.email}</span>
                      <span className="block text-xs" style={{ color: "#666666" }}>
                        {reg.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "#B3B3B3" }}>
                      {reg.hostel}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#B3B3B3" }}>
                      {reg.skills.slice(0, 2).map(skillLabel).join(", ")}
                      {reg.skills.length > 2 && (
                        <span style={{ color: "#666666" }}>
                          {" "}+{reg.skills.length - 2}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={reg.status}
                        onChange={(e) =>
                          updateStatus(reg.id, e.target.value as RegistrationStatus)
                        }
                        className="rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                        style={{
                          backgroundColor: "#0F0F0F",
                          borderColor: "rgba(255,255,255,0.1)",
                          color: STATUS_COLOR[reg.status],
                        }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} style={{ color: "#FFFFFF" }}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>,

                  open && (
                    <tr key={`${reg.id}-detail`} style={{ backgroundColor: "#0F0F0F" }}>
                      <td colSpan={7} className="px-4 py-5">
                        <div className="flex flex-col gap-4">
                          {reg.isPreRegistration && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border border-sky-500/30 bg-sky-500/10 text-sky-400 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                              Pre-Registration Submission
                            </div>
                          )}

                          <div className="flex flex-col gap-1.5">
                            <p
                              className="font-mono text-xs uppercase tracking-widest"
                              style={{ color: "#666666", letterSpacing: "0.12em" }}
                            >
                              All skills
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {reg.skills.map((s) => (
                                <span
                                  key={s}
                                  className="px-2.5 py-1 rounded-full text-xs"
                                  style={{
                                    backgroundColor: "rgba(225,29,46,0.10)",
                                    color: "#B3B3B3",
                                  }}
                                >
                                  {skillLabel(s)}
                                </span>
                              ))}
                            </div>
                            {reg.otherSkill && (
                              <p className="text-xs mt-1" style={{ color: "#B3B3B3" }}>
                                Other: {reg.otherSkill}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <p
                              className="font-mono text-xs uppercase tracking-widest"
                              style={{ color: "#666666", letterSpacing: "0.12em" }}
                            >
                              What they know about NETRONiX
                            </p>
                            <p
                              className="text-sm leading-relaxed whitespace-pre-wrap max-w-3xl"
                              style={{ color: "#B3B3B3" }}
                            >
                              {reg.aboutNetronix}
                            </p>
                          </div>

                          <p className="text-xs" style={{ color: "#666666" }}>
                            Submitted {new Date(reg.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="py-2 px-4 rounded-lg text-sm border transition-colors disabled:opacity-40 hover:bg-white/[0.03]"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "#B3B3B3" }}
          >
            ← Previous
          </button>

          <span className="text-sm" style={{ color: "#666666" }}>
            Page {page + 1} of {pageCount}
          </span>

          <button
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
            className="py-2 px-4 rounded-lg text-sm border transition-colors disabled:opacity-40 hover:bg-white/[0.03]"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "#B3B3B3" }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
