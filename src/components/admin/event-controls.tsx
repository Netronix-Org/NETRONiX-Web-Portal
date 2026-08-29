"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Event, EventStatus } from "@prisma/client";
import { STATUS_LABEL, registrationHref } from "@/lib/events";
import { Check, X, Clock, Calendar } from "lucide-react";

const STATUS_COLOR: Record<EventStatus, string> = {
  live: "#E11D2E",
  coming_soon: "#FFFFFF",
  past: "#666666",
};

/** Split an ISO date string into separate local date (YYYY-MM-DD) and time (HH:mm) parts */
function splitIsoToDateAndTime(iso: string | Date | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };

  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

/** Combine local date (YYYY-MM-DD) and time (HH:mm) into an ISO string */
function combineDateAndTimeToIso(dateStr: string, timeStr: string): string | null {
  if (!dateStr || dateStr.trim() === "") return null;
  const time = timeStr && timeStr.trim() !== "" ? timeStr.trim() : "00:00";
  const combined = new Date(`${dateStr}T${time}`);
  if (Number.isNaN(combined.getTime())) return null;
  return combined.toISOString();
}

function formatDisplayDate(iso: string | Date | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface EventControlsProps {
  event: Event;
  /** Status after the schedule is applied. Computed on the server. */
  shown: EventStatus;
  submissionCount: number;
  onViewSubmissions: () => void;
}

export function EventControls({
  event,
  shown,
  submissionCount,
  onViewSubmissions,
}: EventControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Live schedule date/time states
  const initialLive = splitIsoToDateAndTime(event.autoLiveAt);
  const [liveDate, setLiveDate] = useState(initialLive.date);
  const [liveTime, setLiveTime] = useState(initialLive.time);

  // Close schedule date/time states
  const initialClose = splitIsoToDateAndTime(event.autoCloseAt);
  const [closeDate, setCloseDate] = useState(initialClose.date);
  const [closeTime, setCloseTime] = useState(initialClose.time);

  // Sync state when props update
  useEffect(() => {
    const { date, time } = splitIsoToDateAndTime(event.autoLiveAt);
    setLiveDate(date);
    setLiveTime(time);
  }, [event.autoLiveAt]);

  useEffect(() => {
    const { date, time } = splitIsoToDateAndTime(event.autoCloseAt);
    setCloseDate(date);
    setCloseTime(time);
  }, [event.autoCloseAt]);

  const scheduled =
    shown !== event.status
      ? "Currently overridden by schedule"
      : null;

  async function save(changes: Record<string, unknown>, message = "Saved.") {
    setSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.message ?? "Could not save.");
        return;
      }

      setSavedMessage(message);
      startTransition(() => router.refresh());
      setTimeout(() => setSavedMessage(null), 3000);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  const handleApplyLiveAt = () => {
    const iso = combineDateAndTimeToIso(liveDate, liveTime);
    save({ autoLiveAt: iso }, iso ? "Go-live schedule saved." : "Go-live schedule removed.");
  };

  const handleClearLiveAt = () => {
    setLiveDate("");
    setLiveTime("");
    save({ autoLiveAt: null }, "Go-live schedule cleared.");
  };

  const handleApplyCloseAt = () => {
    const iso = combineDateAndTimeToIso(closeDate, closeTime);
    save({ autoCloseAt: iso }, iso ? "Closing schedule saved." : "Closing schedule removed.");
  };

  const handleClearCloseAt = () => {
    setCloseDate("");
    setCloseTime("");
    save({ autoCloseAt: null }, "Closing schedule cleared.");
  };

  const busy = saving || pending;
  const currentLive = splitIsoToDateAndTime(event.autoLiveAt);
  const liveAtChanged = liveDate !== currentLive.date || liveTime !== currentLive.time;

  const currentClose = splitIsoToDateAndTime(event.autoCloseAt);
  const closeAtChanged = closeDate !== currentClose.date || closeTime !== currentClose.time;

  return (
    <article
      className="rounded-2xl border p-5 md:p-6 flex flex-col gap-6"
      style={{ backgroundColor: "#141414", borderColor: "rgba(255,255,255,0.08)" }}
    >
      {/* ── Title row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-heading font-semibold text-lg text-white">{event.title}</h3>
            {shown === "coming_soon" && event.registrationOpen ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                style={{
                  color: "#38BDF8",
                  backgroundColor: "rgba(56,189,248,0.12)",
                  borderColor: "rgba(56,189,248,0.3)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: "#38BDF8" }}
                />
                Pre-Reg Active
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  color: STATUS_COLOR[shown],
                  backgroundColor:
                    shown === "live"
                      ? "rgba(225,29,46,0.15)"
                      : "rgba(255,255,255,0.06)",
                }}
              >
                {shown === "live" && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "#E11D2E" }}
                  />
                )}
                {STATUS_LABEL[shown]}
              </span>
            )}
          </div>

          <p className="font-mono text-xs" style={{ color: "#888888" }}>
            /{event.slug} · {submissionCount} submissions
            {scheduled && (
              <span className="text-amber-400 font-semibold ml-2">
                · {scheduled}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onViewSubmissions}
            className="py-2 px-4 rounded-lg text-xs font-mono font-medium border transition-colors hover:bg-white/[0.05] cursor-pointer"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "#CCCCCC" }}
          >
            View submissions
          </button>

          {(shown === "live" || (shown === "coming_soon" && event.registrationOpen)) && (
            <a
              href={registrationHref(event.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-4 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer"
              style={{
                borderColor: shown === "live" ? "rgba(225,29,46,0.4)" : "rgba(56,189,248,0.4)",
                color: "#FFFFFF",
                backgroundColor: shown === "live" ? "transparent" : "rgba(56,189,248,0.1)",
              }}
            >
              {shown === "live" ? "Open form ↗" : "Pre-Reg form ↗"}
            </a>
          )}
        </div>
      </div>

      {/* ── Status switch ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-400">
          Status Switch
        </p>

        <div className="flex flex-wrap gap-2">
          {(["coming_soon", "live", "past"] as const).map((value) => {
            const active = event.status === value;
            return (
              <button
                key={value}
                disabled={busy}
                onClick={() => save({ status: value }, `Status changed to ${STATUS_LABEL[value]}`)}
                className="py-2 px-4 rounded-lg text-xs font-mono font-medium border transition-colors disabled:opacity-50 hover:bg-white/[0.03] cursor-pointer"
                style={{
                  backgroundColor: active
                    ? "rgba(225,29,46,0.15)"
                    : "transparent",
                  borderColor: active
                    ? "rgba(225,29,46,0.5)"
                    : "rgba(255,255,255,0.12)",
                  color: active ? "#FFFFFF" : "#888888",
                }}
              >
                {STATUS_LABEL[value]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Registration toggle ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 text-sm cursor-pointer w-fit select-none">
          <input
            type="checkbox"
            className="accent-[#E11D2E] w-4 h-4 rounded cursor-pointer"
            checked={event.registrationOpen}
            disabled={busy}
            onChange={(e) => save({ registrationOpen: e.target.checked }, e.target.checked ? "Registration opened." : "Registration frozen.")}
          />
          <span className="text-neutral-300 text-xs">
            Accept new registrations
            <span className="text-neutral-500">
              {event.status === "coming_soon"
                ? " — enables Pre-Registration mode while event remains marked Coming Soon"
                : " — untick to freeze the form without changing the status"}
            </span>
          </span>
        </label>

        {event.status === "coming_soon" && event.registrationOpen && (
          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 font-mono flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Pre-Registration mode active. Form submissions will be labelled as Pre-Registrations.</span>
            </div>
            <a
              href={registrationHref(event.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:underline whitespace-nowrap"
            >
              Preview Form ↗
            </a>
          </div>
        )}
      </div>

      {/* ── Schedule (Automated Timers) ─────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            Schedule Automation (Optional)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1. Goes Live At */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#0D0D0D] border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <label className="text-neutral-300 font-mono text-[11px] font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-500" /> Goes live at:
              </label>
              {event.autoLiveAt && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleClearLiveAt}
                  className="text-[11px] font-mono text-red-400 hover:text-red-300 inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 font-mono">Date</span>
                <input
                  type="date"
                  value={liveDate}
                  disabled={busy}
                  onChange={(e) => setLiveDate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-mono text-white bg-[#141414] focus:outline-none focus:border-red-500 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 font-mono">Time</span>
                <input
                  type="time"
                  value={liveTime}
                  disabled={busy}
                  onChange={(e) => setLiveTime(e.target.value)}
                  className="w-full rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-mono text-white bg-[#141414] focus:outline-none focus:border-red-500 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-500 font-mono">
                {event.autoLiveAt ? (
                  <>Active: <span className="text-neutral-300">{formatDisplayDate(event.autoLiveAt)}</span></>
                ) : (
                  "No schedule set"
                )}
              </span>

              {liveAtChanged && (
                <button
                  type="button"
                  disabled={busy || !liveDate}
                  onClick={handleApplyLiveAt}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-mono font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Save Date & Time
                </button>
              )}
            </div>
          </div>

          {/* 2. Closes At */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#0D0D0D] border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <label className="text-neutral-300 font-mono text-[11px] font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-500" /> Closes / Concludes at:
              </label>
              {event.autoCloseAt && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleClearCloseAt}
                  className="text-[11px] font-mono text-red-400 hover:text-red-300 inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 font-mono">Date</span>
                <input
                  type="date"
                  value={closeDate}
                  disabled={busy}
                  onChange={(e) => setCloseDate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-mono text-white bg-[#141414] focus:outline-none focus:border-red-500 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 font-mono">Time</span>
                <input
                  type="time"
                  value={closeTime}
                  disabled={busy}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-mono text-white bg-[#141414] focus:outline-none focus:border-red-500 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-500 font-mono">
                {event.autoCloseAt ? (
                  <>Active: <span className="text-neutral-300">{formatDisplayDate(event.autoCloseAt)}</span></>
                ) : (
                  "No schedule set"
                )}
              </span>

              {closeAtChanged && (
                <button
                  type="button"
                  disabled={busy || !closeDate}
                  onClick={handleApplyCloseAt}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-mono font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Save Date & Time
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Feedback Message ───────────────────────────────────────────── */}
      {error && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono">
          {error}
        </div>
      )}
      {savedMessage && (
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-mono flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          {savedMessage}
        </div>
      )}
    </article>
  );
}


