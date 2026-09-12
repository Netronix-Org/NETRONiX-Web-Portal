"use client";

import { useState } from "react";
import type { InterviewScore, RegistrationStatus } from "@prisma/client";
import {
  SCORE_METRICS,
  computeTotal,
  type ScoreMetricKey,
  type ScoreMetrics,
} from "@/lib/validation/interview-score";
import { FIELD_BASE_COMPACT as FIELD_BASE, FIELD_STYLE } from "@/components/forms/field-primitives";

const RATING_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

type EditableScore = ScoreMetrics & { remarks: string };

function toEditableScore(score: InterviewScore | null | undefined): EditableScore {
  const base: EditableScore = { remarks: score?.remarks ?? "" };
  for (const metric of SCORE_METRICS) {
    base[metric.key] = score?.[metric.key] ?? null;
  }
  return base;
}

interface InterviewScoreFormProps {
  registrationId: string;
  score: InterviewScore | null;
  onSaved: (score: InterviewScore, status: RegistrationStatus) => void;
}

export function InterviewScoreForm({ registrationId, score, onSaved }: InterviewScoreFormProps) {
  const [draft, setDraft] = useState<EditableScore>(() => toEditableScore(score));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = computeTotal(draft);

  function setMetric(key: ScoreMetricKey, value: string) {
    setSavedAt(null);
    setDraft((prev) => ({ ...prev, [key]: value === "" ? null : Number(value) }));
  }

  async function save() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, remarks: draft.remarks.trim() || null }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(payload?.message ?? "Could not save the score.");
        return;
      }

      onSaved(payload.score, payload.status);
      setSavedAt(Date.now());
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border p-4"
      style={{ backgroundColor: "#141414", borderColor: "rgba(225,29,46,0.2)" }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: "#E11D2E", letterSpacing: "0.12em" }}
        >
          Panel Scoring
        </p>
        <p className="text-sm font-medium" style={{ color: "#FFFFFF" }}>
          Total:{" "}
          <span style={{ color: total !== null ? "#4ADE80" : "#666666" }}>
            {total !== null ? `${total}/10` : "Not scored yet"}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {SCORE_METRICS.map((metric) => (
          <div key={metric.key} className="flex flex-col gap-1.5">
            <label
              htmlFor={`score-${registrationId}-${metric.key}`}
              className="text-xs"
              style={{ color: "#888888" }}
            >
              {metric.label}
            </label>
            <select
              id={`score-${registrationId}-${metric.key}`}
              className={FIELD_BASE}
              style={FIELD_STYLE}
              value={draft[metric.key] ?? ""}
              onChange={(e) => setMetric(metric.key, e.target.value)}
            >
              <option value="">—</option>
              {RATING_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`score-${registrationId}-remarks`}
          className="text-xs"
          style={{ color: "#888888" }}
        >
          Remarks
        </label>
        <textarea
          id={`score-${registrationId}-remarks`}
          rows={2}
          placeholder="Notes from the interview..."
          className={`${FIELD_BASE} resize-y min-h-[60px] placeholder:text-[#555555]`}
          style={FIELD_STYLE}
          value={draft.remarks}
          onChange={(e) => {
            setSavedAt(null);
            setDraft((prev) => ({ ...prev, remarks: e.target.value }));
          }}
        />
      </div>

      {error && (
        <p role="alert" className="text-xs" style={{ color: "#E11D2E" }}>
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="py-2 px-4 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:bg-white/[0.03]"
          style={{ borderColor: "rgba(225,29,46,0.5)", color: "#FFFFFF" }}
        >
          {saving ? "Saving..." : "Save Score"}
        </button>

        {savedAt !== null && (
          <span className="text-xs" style={{ color: "#4ADE80" }}>
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
