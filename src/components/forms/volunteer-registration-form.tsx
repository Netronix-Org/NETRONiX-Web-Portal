"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  VolunteerRegistrationSchema,
  EMPTY_VOLUNTEER_REGISTRATION,
  VOLUNTEER_BATCH_OPTIONS,
  SKILL_RATING_CATEGORIES,
  type VolunteerRegistrationInput,
} from "@/lib/validation/volunteer-registration";

// ─── Shared field styling (matches the standard registration form) ─────────

const FIELD_BASE =
  "w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors " +
  "placeholder:text-[#555555] focus:border-[rgba(225,29,46,0.6)]";

const FIELD_STYLE = {
  backgroundColor: "#0F0F0F",
  borderColor: "rgba(255,255,255,0.1)",
  color: "#FFFFFF",
} as const;

function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="font-mono text-xs uppercase tracking-widest"
        style={{ color: "#B3B3B3", letterSpacing: "0.12em" }}
      >
        {children}
      </label>
      {hint && (
        <span className="text-xs" style={{ color: "#666666" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs" style={{ color: "#E11D2E" }}>
      {message}
    </p>
  );
}

/** A row of mutually-exclusive pill buttons — used for Batch and Yes/No. */
function PillGroup({
  name,
  options,
  value,
  onChange,
  onBlur,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm cursor-pointer transition-colors select-none"
            style={{
              backgroundColor: checked ? "rgba(225,29,46,0.10)" : "#0F0F0F",
              borderColor: checked ? "rgba(225,29,46,0.5)" : "rgba(255,255,255,0.1)",
              color: checked ? "#FFFFFF" : "#B3B3B3",
            }}
          >
            <input
              type="radio"
              name={name}
              className="accent-[#E11D2E] w-4 h-4 shrink-0"
              checked={checked}
              onChange={() => onChange(opt.value)}
              onBlur={onBlur}
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

/** A single "Worst 1 2 3 4 5 Best" linear-scale row. */
function ScaleRow({
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
}: {
  name: string;
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-sm" style={{ color: "#FFFFFF" }}>
        {label}
      </p>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex items-center gap-2 sm:gap-4"
      >
        <span className="text-xs shrink-0" style={{ color: "#666666" }}>
          Worst
        </span>
        {(["1", "2", "3", "4", "5"] as const).map((n) => {
          const checked = value === n;
          return (
            <label
              key={n}
              className="flex flex-col items-center gap-1 cursor-pointer select-none"
            >
              <input
                type="radio"
                name={name}
                className="accent-[#E11D2E] w-4 h-4"
                checked={checked}
                onChange={() => onChange(n)}
                onBlur={onBlur}
              />
              <span className="text-xs" style={{ color: checked ? "#FFFFFF" : "#666666" }}>
                {n}
              </span>
            </label>
          );
        })}
        <span className="text-xs shrink-0" style={{ color: "#666666" }}>
          Best
        </span>
      </div>
      <FieldError message={error} />
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface VolunteerRegistrationFormProps {
  slug: string;
  eventTitle: string;
  isPreReg?: boolean;
}

export function VolunteerRegistrationForm({
  slug,
  eventTitle,
  isPreReg = false,
}: VolunteerRegistrationFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VolunteerRegistrationInput>({
    resolver: zodResolver(VolunteerRegistrationSchema),
    defaultValues: EMPTY_VOLUNTEER_REGISTRATION,
    mode: "onBlur",
  });

  const otherSociety = watch("otherSociety");
  const showOtherSocietyList = otherSociety === "yes";

  async function onSubmit(values: VolunteerRegistrationInput) {
    setServerError(null);

    try {
      const res = await fetch(`/api/events/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const fieldErrors = payload?.errors as Record<string, string[]> | undefined;

        if (fieldErrors) {
          for (const [field, messages] of Object.entries(fieldErrors)) {
            if (messages?.[0]) {
              setError(field as keyof VolunteerRegistrationInput, {
                message: messages[0],
              });
            }
          }
        }

        setServerError(payload?.message ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted({ id: payload.id });
    } catch {
      setServerError("Could not reach the server. Check your connection and try again.");
    }
  }

  // ─── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border p-8 flex flex-col gap-4"
        style={{ backgroundColor: "#141414", borderColor: "rgba(225,29,46,0.3)" }}
      >
        <p
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: isPreReg ? "#38BDF8" : "#E11D2E", letterSpacing: "0.12em" }}
        >
          {isPreReg ? "Pre-Registration Confirmed" : "Registration received"}
        </p>

        <h2 className="font-heading font-semibold text-2xl">
          {isPreReg ? `You're on the early list for ${eventTitle}.` : `You're in for ${eventTitle}.`}
        </h2>

        <p className="text-sm leading-relaxed" style={{ color: "#B3B3B3" }}>
          {isPreReg
            ? "Your pre-registration has been recorded. We will notify you with priority updates once the event officially launches."
            : "Your submission is saved. Keep this reference in case you need to ask us about it."}
        </p>

        <code
          className="font-mono text-xs px-3 py-2 rounded-lg w-fit"
          style={{ backgroundColor: "#0F0F0F", color: "#B3B3B3" }}
        >
          {submitted.id}
        </code>
      </motion.div>
    );
  }

  // ─── Form ──────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-2xl border p-6 md:p-8 flex flex-col gap-7"
      style={{ backgroundColor: "#141414", borderColor: "rgba(255,255,255,0.08)" }}
    >
      {/* ── Name ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Name</Label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          placeholder="Ahmed Raza"
          className={FIELD_BASE}
          style={FIELD_STYLE}
          aria-invalid={Boolean(errors.fullName)}
          {...register("fullName")}
        />
        <FieldError message={errors.fullName?.message} />
      </div>

      {/* ── Registration number + Faculty ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="registrationNumber">Registration Number</Label>
          <input
            id="registrationNumber"
            type="text"
            placeholder="2023388"
            className={FIELD_BASE}
            style={FIELD_STYLE}
            aria-invalid={Boolean(errors.registrationNumber)}
            {...register("registrationNumber")}
          />
          <FieldError message={errors.registrationNumber?.message} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="faculty">Faculty</Label>
          <input
            id="faculty"
            type="text"
            placeholder="FES / FCSE / FME / FEE"
            className={FIELD_BASE}
            style={FIELD_STYLE}
            aria-invalid={Boolean(errors.faculty)}
            {...register("faculty")}
          />
          <FieldError message={errors.faculty?.message} />
        </div>
      </div>

      {/* ── Contact number + Email ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Contact Number</Label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="03XX XXXXXXX"
            className={FIELD_BASE}
            style={FIELD_STYLE}
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
          <FieldError message={errors.phone?.message} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="u2023388@giki.edu.pk"
            className={FIELD_BASE}
            style={FIELD_STYLE}
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>
      </div>

      {/* ── Batch ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="batch-group">Batch</Label>
        <Controller
          name="batch"
          control={control}
          render={({ field }) => (
            <div id="batch-group">
              <PillGroup
                name="batch"
                options={VOLUNTEER_BATCH_OPTIONS.map((b) => ({
                  value: String(b),
                  label: `Batch ${b}`,
                }))}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            </div>
          )}
        />
        <FieldError message={errors.batch?.message} />
      </div>

      {/* ── Weaknesses / Strengths ─────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="weaknesses">List 3 of your Weaknesses:</Label>
        <textarea
          id="weaknesses"
          rows={3}
          className={`${FIELD_BASE} resize-y min-h-[90px]`}
          style={FIELD_STYLE}
          aria-invalid={Boolean(errors.weaknesses)}
          {...register("weaknesses")}
        />
        <FieldError message={errors.weaknesses?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="strengths">List 3 of your Strengths:</Label>
        <textarea
          id="strengths"
          rows={3}
          className={`${FIELD_BASE} resize-y min-h-[90px]`}
          style={FIELD_STYLE}
          aria-invalid={Boolean(errors.strengths)}
          {...register("strengths")}
        />
        <FieldError message={errors.strengths?.message} />
      </div>

      {/* ── Why apply / Regret ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="whyApply">Why did you choose to apply to NETRONiX?</Label>
        <textarea
          id="whyApply"
          rows={5}
          className={`${FIELD_BASE} resize-y min-h-[120px]`}
          style={FIELD_STYLE}
          aria-invalid={Boolean(errors.whyApply)}
          {...register("whyApply")}
        />
        <FieldError message={errors.whyApply?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="regret">What&apos;s your greatest regret?</Label>
        <textarea
          id="regret"
          rows={3}
          className={`${FIELD_BASE} resize-y min-h-[90px]`}
          style={FIELD_STYLE}
          aria-invalid={Boolean(errors.regret)}
          {...register("regret")}
        />
        <FieldError message={errors.regret?.message} />
      </div>

      {/* ── Other society membership ───────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="otherSociety-group">
          Are you currently a member or volunteer of any other society?
        </Label>
        <Controller
          name="otherSociety"
          control={control}
          render={({ field }) => (
            <div id="otherSociety-group">
              <PillGroup
                name="otherSociety"
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            </div>
          )}
        />
        <FieldError message={errors.otherSociety?.message} />

        <AnimatePresence initial={false}>
          {showOtherSocietyList && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-2 overflow-hidden pt-2"
            >
              <Label htmlFor="otherSocietyList">If yes, list them in order of preference:</Label>
              <textarea
                id="otherSocietyList"
                rows={2}
                className={`${FIELD_BASE} resize-y min-h-[70px]`}
                style={FIELD_STYLE}
                aria-invalid={Boolean(errors.otherSocietyList)}
                {...register("otherSocietyList")}
              />
              <FieldError message={errors.otherSocietyList?.message} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Skill ratings ───────────────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">Rate your skills</legend>
        <Label htmlFor="skillRatings-group" hint="1 being the worst and 5 being the best.">
          Rate your skills
        </Label>

        <div id="skillRatings-group" className="flex flex-col">
          {SKILL_RATING_CATEGORIES.map((cat) => (
            <Controller
              key={cat.key}
              name={`skillRatings.${cat.key}`}
              control={control}
              render={({ field }) => (
                <ScaleRow
                  name={`skillRatings.${cat.key}`}
                  label={cat.label}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.skillRatings?.[cat.key]?.message}
                />
              )}
            />
          ))}
        </div>
      </fieldset>

      {/* ── Server error ───────────────────────────────────────────────── */}
      {serverError && (
        <p
          role="alert"
          className="text-sm rounded-lg border px-4 py-3"
          style={{
            color: "#E11D2E",
            borderColor: "rgba(225,29,46,0.4)",
            backgroundColor: "rgba(225,29,46,0.08)",
          }}
        >
          {serverError}
        </p>
      )}

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={!isSubmitting ? { scale: 1.01 } : {}}
        whileTap={!isSubmitting ? { scale: 0.99 } : {}}
        className="w-full py-3.5 px-6 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        style={{
          backgroundColor: isPreReg ? "rgba(56,189,248,0.15)" : "rgba(225,29,46,0.12)",
          borderColor: isPreReg ? "rgba(56,189,248,0.5)" : "rgba(225,29,46,0.5)",
          color: "#FFFFFF",
        }}
      >
        {isSubmitting
          ? isPreReg
            ? "Submitting Pre-Registration..."
            : "Submitting..."
          : isPreReg
            ? `Pre-Register for ${eventTitle} →`
            : `Register for ${eventTitle} →`}
      </motion.button>

      <p className="text-xs text-center" style={{ color: "#666666" }}>
        One registration per registration number.
      </p>
    </form>
  );
}
