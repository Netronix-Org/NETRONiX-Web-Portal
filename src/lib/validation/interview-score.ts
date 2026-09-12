/**
 * Panel interview scoring — one shared scorecard per candidate.
 *
 * Any admin can view and update a candidate's scorecard; there is no
 * per-panelist ownership, so `scoredById` just tracks who last saved it.
 * Every metric is 1-10, and the total is the average of whichever metrics
 * have been scored so far (so a partially-filled-in scorecard still shows a
 * running total during the interview).
 */

import { z } from "zod";

export const SCORE_METRICS = [
  { key: "confidence", label: "Confidence" },
  { key: "communication", label: "Communication" },
  { key: "personality", label: "Personality" },
  { key: "attitude", label: "Attitude" },
  { key: "sponsorship", label: "Sponsorship" },
  { key: "gaming", label: "Gaming" },
  { key: "networking", label: "Networking" },
  { key: "liason", label: "Liason" },
  { key: "tech", label: "Tech" },
  { key: "pubCreativity", label: "Pub/Creativity" },
] as const;

export type ScoreMetricKey = (typeof SCORE_METRICS)[number]["key"];

const metricField = z
  .number()
  .int()
  .min(1, "1-10")
  .max(10, "1-10")
  .nullable()
  .optional();

export const InterviewScorePatchSchema = z.object({
  remarks: z.string().trim().max(2000, "Keep this under 2000 characters").nullable().optional(),
  confidence: metricField,
  communication: metricField,
  personality: metricField,
  attitude: metricField,
  sponsorship: metricField,
  gaming: metricField,
  networking: metricField,
  liason: metricField,
  tech: metricField,
  pubCreativity: metricField,
});

export type InterviewScorePatchInput = z.infer<typeof InterviewScorePatchSchema>;

/** Loose shape covering both the Prisma row and the client's local edits. */
export type ScoreMetrics = Partial<Record<ScoreMetricKey, number | null>>;

/** Average of whichever metrics are set, rounded to 1 decimal. Null if none are. */
export function computeTotal(score: ScoreMetrics | null | undefined): number | null {
  if (!score) return null;

  const values = SCORE_METRICS.map((m) => score[m.key]).filter(
    (v): v is number => typeof v === "number"
  );

  if (values.length === 0) return null;

  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(avg * 10) / 10;
}
