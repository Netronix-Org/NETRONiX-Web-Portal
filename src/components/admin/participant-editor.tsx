"use client";

import { useId, useState, type FormEvent } from "react";
import { Check, LoaderCircle, Pencil, X } from "lucide-react";
import type { Registration } from "@prisma/client";
import type { AdminParticipant } from "@/lib/admin-participant";
import { EventRegistrationSchema, getAmbassadorCode, getHncChoices, getTransportPreference, getUgxGame } from "@/lib/validation/event-registration";
import { rosterButton } from "./roster-controls";

export type EditableParticipant = Pick<Registration,
  "id" | "fullName" | "email" | "phone" | "cnic" | "city" | "university" | "ambassador" | "formData"
> & { updatedAt: string };

function initialValues(row: EditableParticipant) {
  const choices = getHncChoices(row.formData);
  return {
    fullName: row.fullName, email: row.email, phone: row.phone, cnic: row.cnic ?? "",
    city: row.city ?? "", university: row.university ?? "", ambassador: row.ambassador ?? "",
    ambassadorCode: getAmbassadorCode(row.formData) ?? "",
    transport: getTransportPreference(row.formData)?.toLowerCase() ?? "",
    registrationType: choices.registrationType ?? "", socials: choices.socials ?? "",
    game: getUgxGame(row.formData) ?? "",
  };
}

type Field = keyof ReturnType<typeof initialValues>;
const contactFields: { key: Field; label: string; type?: string; max: number; required?: boolean }[] = [
  { key: "fullName", label: "Name", max: 100, required: true },
  { key: "email", label: "Email", type: "email", max: 150, required: true },
  { key: "phone", label: "Phone", type: "tel", max: 25, required: true },
  { key: "cnic", label: "CNIC", max: 15 },
  { key: "city", label: "City", max: 100 },
  { key: "university", label: "University (optional)", max: 200 },
  { key: "ambassador", label: "Ambassador name (optional)", max: 100 },
  { key: "ambassadorCode", label: "Ambassador code (optional)", max: 4 },
];
const inputClass = "mt-1.5 min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-[#0F0F10] px-3 text-sm text-white focus-visible:outline-2 focus-visible:outline-sky-300 disabled:opacity-50";

export function ParticipantEditor({ row, eventSlug, onSaved }: {
  row: EditableParticipant;
  eventSlug: string;
  onSaved: (registration: AdminParticipant) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(() => initialValues(row));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const original = initialValues(row);
  const options: { key: Field; label: string; choices: readonly string[] }[] = [
    { key: "transport", label: "Transport", choices: ["yes", "no"] },
    ...(eventSlug === "ugx"
      ? [{ key: "game" as const, label: "Game", choices: ["FC26", "Tekken 8"] }]
      : [
        { key: "registrationType" as const, label: "Registration type", choices: ["Participant", "Observer"] },
        { key: "socials" as const, label: "Socials opt-in", choices: ["Yes", "No"] },
      ]),
  ];

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const changes = Object.fromEntries(Object.entries(values).filter(([key, value]) => original[key as Field] !== value));
    const parsed = EventRegistrationSchema.partial().safeParse(changes);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the fields and try again.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/registrations/${row.id}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updatedAt: row.updatedAt, changes: parsed.data }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Couldn't save changes.");
      setOpen(false);
      onSaved(result.registration);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't save changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return (
    <button type="button" onClick={() => { setValues(initialValues(row)); setError(""); setOpen(true); }} className={rosterButton}>
      <Pencil size={15} aria-hidden="true" /> Edit registration
    </button>
  );

  return (
    <form onSubmit={save} aria-labelledby={id} className="space-y-4 border-t border-white/10 pt-5">
      <h4 id={id} className="font-heading text-lg font-semibold">Edit registration</h4>
      <fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2 disabled:opacity-60">
        {contactFields.map(({ key, label, type, max, required }) => (
          <label key={key} className="min-w-0 text-sm text-neutral-300">
            {label}
            <input
              type={type ?? "text"}
              required={required}
              maxLength={max}
              autoComplete="off"
              readOnly={key === "ambassador" && Boolean(values.ambassadorCode)}
              inputMode={key === "cnic" || key === "ambassadorCode" ? "numeric" : undefined}
              value={values[key]}
              onChange={(event) => setValues({ ...values, [key]: event.target.value })}
              className={inputClass}
            />
          </label>
        ))}
        {options.map(({ key, label, choices }) => (
          <label key={key} className="min-w-0 text-sm text-neutral-300">
            {label}
            <select value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} className={inputClass}>
              <option value="" disabled>Unspecified</option>
              {choices.map((value) => <option key={value} value={value}>{value === "yes" ? "Yes" : value === "no" ? "No" : value}</option>)}
            </select>
          </label>
        ))}
      </fieldset>
      <p className="text-xs leading-relaxed text-neutral-400">A valid ambassador code links this registration to that ambassador and sets their name. Clear both ambassador fields to remove the referral.</p>
      {values.email !== original.email && (
        <p role="status" className="text-xs leading-relaxed text-sky-200">The participant will use this email to access this registration in the portal. Check their portal password after saving. Other registrations can be updated separately.</p>
      )}
      {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving || Object.keys(values).every((key) => values[key as Field] === original[key as Field])} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-300 px-4 text-sm font-semibold text-slate-950 hover:bg-sky-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? <LoaderCircle size={15} aria-hidden="true" className="motion-safe:animate-spin" /> : <Check size={15} aria-hidden="true" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" disabled={saving} onClick={() => setOpen(false)} className={rosterButton}><X size={15} aria-hidden="true" /> Cancel</button>
      </div>
    </form>
  );
}
