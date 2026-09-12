"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  RegistrationSchema,
  EMPTY_REGISTRATION,
  type RegistrationInput,
} from "@/lib/validation/registration";
import { BATCH_OPTIONS, SKILL_GROUPS, SKILL_OPTIONS } from "@/lib/events";
import { FIELD_BASE, FIELD_STYLE, Label, FieldError } from "./field-primitives";

// ─── Component ───────────────────────────────────────────────────────────────

interface RegistrationFormProps {
  slug: string;
  eventTitle: string;
  isPreReg?: boolean;
}

export function RegistrationForm({ slug, eventTitle, isPreReg = false }: RegistrationFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(RegistrationSchema),
    defaultValues: EMPTY_REGISTRATION,
    mode: "onBlur",
  });

  const skills = watch("skills");
  const showOtherSkill = skills?.includes("other");

  async function onSubmit(values: RegistrationInput) {
    setServerError(null);

    try {
      const res = await fetch(`/api/events/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Map server-side field errors back onto the form where possible.
        const fieldErrors = payload?.errors as
          | Record<string, string[]>
          | undefined;

        if (fieldErrors) {
          for (const [field, messages] of Object.entries(fieldErrors)) {
            if (messages?.[0]) {
              setError(field as keyof RegistrationInput, {
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
      setServerError(
        "Could not reach the server. Check your connection and try again."
      );
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
        style={{
          backgroundColor: "#141414",
          borderColor: "rgba(225,29,46,0.3)",
        }}
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
      style={{
        backgroundColor: "#141414",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {/* ── Name ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Full Name</Label>
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

      {/* ── Registration number + Batch ────────────────────────────────── */}
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
          <Label htmlFor="batch">Batch</Label>
          <select
            id="batch"
            className={FIELD_BASE}
            style={FIELD_STYLE}
            aria-invalid={Boolean(errors.batch)}
            {...register("batch")}
          >
            {BATCH_OPTIONS.map((batch) => (
              <option key={batch} value={String(batch)}>
                Batch {batch}
              </option>
            ))}
          </select>
          <FieldError message={errors.batch?.message} />
        </div>
      </div>

      {/* ── Email + Phone ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone Number</Label>
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
      </div>

      {/* ── Hostel ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="hostel" hint="Hostel and room number, e.g. H-7 / 214">
          Hostel Number
        </Label>
        <input
          id="hostel"
          type="text"
          placeholder="H-7 / 214"
          className={FIELD_BASE}
          style={FIELD_STYLE}
          aria-invalid={Boolean(errors.hostel)}
          {...register("hostel")}
        />
        <FieldError message={errors.hostel?.message} />
      </div>

      {/* ── Skills checkboxes ──────────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="sr-only">Your skills</legend>

        <Label htmlFor="skills-group" hint="Tick everything that applies.">
          Your Skills
        </Label>

        <Controller
          name="skills"
          control={control}
          render={({ field }) => (
            <div id="skills-group" className="flex flex-col gap-5">
              {SKILL_GROUPS.map((group) => (
                <div key={group} className="flex flex-col gap-2.5">
                  <p
                    className="font-mono text-[11px] uppercase tracking-widest"
                    style={{ color: "#666666", letterSpacing: "0.12em" }}
                  >
                    {group}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SKILL_OPTIONS.filter((s) => s.group === group).map(
                      (skill) => {
                        const checked = field.value?.includes(skill.value);

                        return (
                          <label
                            key={skill.value}
                            className="flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors select-none"
                            style={{
                              backgroundColor: checked
                                ? "rgba(225,29,46,0.10)"
                                : "#0F0F0F",
                              borderColor: checked
                                ? "rgba(225,29,46,0.5)"
                                : "rgba(255,255,255,0.1)",
                              color: checked ? "#FFFFFF" : "#B3B3B3",
                            }}
                          >
                            <input
                              type="checkbox"
                              className="accent-[#E11D2E] w-4 h-4 shrink-0"
                              value={skill.value}
                              checked={checked ?? false}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...(field.value ?? []), skill.value]
                                  : (field.value ?? []).filter(
                                      (v) => v !== skill.value
                                    );
                                field.onChange(next);
                              }}
                              onBlur={field.onBlur}
                            />
                            {skill.label}
                          </label>
                        );
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        />

        <FieldError message={errors.skills?.message} />

        {/* Free-text partner to the "Other" checkbox */}
        <AnimatePresence initial={false}>
          {showOtherSkill && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-2 overflow-hidden"
            >
              <Label htmlFor="otherSkill">Your other skill</Label>
              <input
                id="otherSkill"
                type="text"
                placeholder="3D modelling, sound engineering, ..."
                className={FIELD_BASE}
                style={FIELD_STYLE}
                aria-invalid={Boolean(errors.otherSkill)}
                {...register("otherSkill")}
              />
              <FieldError message={errors.otherSkill?.message} />
            </motion.div>
          )}
        </AnimatePresence>
      </fieldset>

      {/* ── About NETRONiX ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="aboutNetronix"
          hint="What do you know about us, and why do you want in? Be honest — this is the answer we actually read."
        >
          What do you know about NETRONiX?
        </Label>
        <textarea
          id="aboutNetronix"
          rows={6}
          placeholder="Write a few lines..."
          className={`${FIELD_BASE} resize-y min-h-[140px]`}
          style={FIELD_STYLE}
          aria-invalid={Boolean(errors.aboutNetronix)}
          {...register("aboutNetronix")}
        />
        <FieldError message={errors.aboutNetronix?.message} />
      </div>

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
          ? (isPreReg ? "Submitting Pre-Registration..." : "Submitting...")
          : (isPreReg ? `Pre-Register for ${eventTitle} →` : `Register for ${eventTitle} →`)}
      </motion.button>

      <p className="text-xs text-center" style={{ color: "#666666" }}>
        One registration per registration number.
      </p>
    </form>
  );
}
