import { SKILL_RATING_CATEGORIES } from "./validation/volunteer-registration";
import { SCORE_METRICS } from "./validation/interview-score";

export function registrationExportColumns(slug: string): string[] {
  if (slug === "hack-n-connect" || slug === "ugx") return [
    "Submitted At", "Type", "Name", "Phone", "Email", "CNIC", "City",
    "Ambassador", "Ambassador Code", "University", "Transport",
    ...(slug === "ugx" ? ["Game"] : ["Registration type", "Socials opt-in"]),
    "Payment status", "Ambassador verified at (UTC)", "Admin Notes",
  ];
  return [
    "Submitted At", "Type", "Name", "Registration Number", "Batch", "Email", "Phone",
    "Hostel", "Skills", "Other Skill", "About NETRONiX", "Faculty", "Weaknesses",
    "Strengths", "Why Apply", "Greatest Regret", "Other Society",
    ...SKILL_RATING_CATEGORIES.map((category) => category.label),
    "Interview Remarks", ...SCORE_METRICS.map((metric) => `Interview ${metric.label}`),
    "Interview Total/10", "Status", "Admin Notes",
  ];
}

/** Missing selection retains the full export used by existing callers. */
export function selectedExportColumns(available: string[], params: URLSearchParams): string[] | null {
  const requested = params.getAll("column");
  if (!requested.length) return available;
  if (requested.length > available.length || new Set(requested).size !== requested.length ||
      requested.some((column) => !available.includes(column))) return null;
  return requested;
}
