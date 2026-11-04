"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react";
import { getEventRegistrationSchema, UGX_GAMES, TRANSPORT_NOTICE, type EventRegistrationInput, type EventRegistrationData } from "@/lib/validation/event-registration";
import styles from "./event-registration.module.css";

const FIELDS = [
  { name: "fullName", label: "Name", type: "text", autoComplete: "name", placeholder: "Your full name", maxLength: 100 },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", placeholder: "03XX XXXXXXX", maxLength: 25 },
  { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com", maxLength: 150 },
  { name: "cnic", label: "CNIC", type: "text", autoComplete: "off", placeholder: "12345-1234567-1", maxLength: 15 },
  { name: "city", label: "City", type: "text", autoComplete: "address-level2", placeholder: "Your city", maxLength: 100 },
  { name: "ambassador", label: "Ambassador", type: "text", autoComplete: "off", placeholder: "Ambassador's name", maxLength: 100, optional: true },
  { name: "university", label: "University", type: "text", autoComplete: "organization", placeholder: "Your university's name", maxLength: 200, optional: true },
  { name: "ambassadorCode", label: "Ambassador code", type: "text", autoComplete: "off", placeholder: "4-digit code", maxLength: 4, optional: true },
] as const;

const HNC_FIELDS = [
  { name: "registrationType", label: "Register as", placeholder: "Select your registration type", options: ["Participant", "Observer"] },
  { name: "socials", label: "Would you like to opt in for socials?", placeholder: "Select your preference", options: ["Yes", "No"] },
] as const;

export function EventRegistrationForm({ slug, eventTitle, isPreReg = false }: { slug: string; eventTitle: string; isPreReg?: boolean }) {
  const isUgx = slug === "ugx";
  const isHnc = slug === "hack-n-connect";
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<EventRegistrationInput, unknown, EventRegistrationData>({ resolver: zodResolver(getEventRegistrationSchema(slug)) });

  async function submit(values: EventRegistrationData) {
    setError(null);
    try {
      const response = await fetch(`/api/events/${slug}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json();
      if (!response.ok) {
        if (data.errors) {
          for (const field of FIELDS) {
            const message = data.errors[field.name]?.[0];
            if (message) setFieldError(field.name, { type: "server", message });
          }
          for (const field of ["game", "transport", "registrationType", "socials"] as const) {
            const message = data.errors[field]?.[0];
            if (message) setFieldError(field, { type: "server", message });
          }
        }
        setError(data.message || "Couldn't save your registration. Please try again.");
        return;
      }
      setEmailSent(data.emailSent === true);
      setSubmitted(data.id);
    } catch {
      setError("Couldn't connect. Check your connection and try again; your details are still here.");
    }
  }

  if (submitted) {
    return (
      <div ref={(node) => { node?.focus(); }} tabIndex={-1} role="status" className={styles.panel}>
        <CheckCircle2 size={36} className={styles.successIcon} aria-hidden="true" />
        <h2 className={styles.successTitle}>{isPreReg ? "Pre-registration received." : "You’re registered."}</h2>
        <p className={styles.closed}>Your {isPreReg ? "pre-registration" : "registration"} for {eventTitle} is saved. Keep this reference if you need to contact the event team.</p>
        <p className={styles.closed}>{emailSent ? "Your confirmation email includes your password and a link to the participant portal. Payment instructions will follow once finalized." : "We couldn’t send your confirmation email. Open the participant portal and select Email me my password to request your sign-in details."}</p>
        <code className={styles.reference}>{submitted}</code>
        <Link href="/participants/portal" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#93C5FD] underline underline-offset-4">
          Open participant portal <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate aria-label={`${eventTitle} registration`} className={styles.panel}>
      <div className={styles.formHeader}><h2>Your details</h2><span>{isPreReg ? "Pre-registration open" : "Registration open"}</span></div>
      <p className={styles.formIntro}>
        {isHnc
          ? "All fields are required except ambassador, university and ambassador code."
          : <>Name, phone, email, CNIC, city, game and transport preference are required.<br />Ambassador, university and ambassador code are optional.</>}
      </p>
      <fieldset disabled={isSubmitting} className={styles.fields}>
        <legend className="sr-only">Participant details</legend>
        {FIELDS.map((field) => {
          const optional = "optional" in field && field.optional;
          const message = errors[field.name]?.message;
          return (
            <div key={field.name} className={`${styles.field} ${field.name === "fullName" || field.name === "ambassadorCode" ? styles.full : ""}`}>
              <label htmlFor={`participant-${field.name}`} className={styles.label}>{field.label}{optional && <span>Optional</span>}</label>
              <input id={`participant-${field.name}`} type={field.type} autoComplete={field.autoComplete} inputMode={field.name === "cnic" || field.name === "ambassadorCode" ? "numeric" : undefined} placeholder={field.placeholder} maxLength={field.maxLength} required={!optional} aria-invalid={Boolean(message)} aria-describedby={message ? `participant-${field.name}-error` : undefined}
                className={styles.input} {...register(field.name)} />
              {message && <p id={`participant-${field.name}-error`} role="alert" className={styles.fieldError}>{message}</p>}
            </div>
          );
        })}
        {isUgx && (
          <div className={`${styles.field} ${styles.full}`}>
            <label htmlFor="participant-game" className={styles.label}>Game</label>
            <select id="participant-game" required defaultValue="" aria-invalid={Boolean(errors.game)} aria-describedby={errors.game ? "participant-game-error" : undefined} className={`${styles.input} ${styles.select}`} {...register("game")}>
              <option value="" disabled>Select your game</option>
              {UGX_GAMES.map((game) => <option key={game} value={game}>{game}</option>)}
            </select>
            {errors.game && <p id="participant-game-error" role="alert" className={styles.fieldError}>{errors.game.message}</p>}
          </div>
        )}
        {isHnc && HNC_FIELDS.map(({ name, label, placeholder, options }) => {
          const id = `participant-${name}`;
          const message = errors[name]?.message;
          return (
            <div key={name} className={styles.field}>
              <label htmlFor={id} className={styles.label}>{label}</label>
              <select
                id={id}
                required
                defaultValue=""
                aria-invalid={Boolean(message)}
                aria-describedby={message ? `${id}-error` : undefined}
                className={`${styles.input} ${styles.select}`}
                {...register(name)}
              >
                <option value="" disabled>{placeholder}</option>
                {options.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              {message && <p id={`${id}-error`} role="alert" className={styles.fieldError}>{message}</p>}
            </div>
          );
        })}
        <div className={`${styles.field} ${styles.full}`}>
          <label htmlFor="participant-transport" className={styles.label}>Would you like to avail transport?</label>
          <select id="participant-transport" required defaultValue="" aria-invalid={Boolean(errors.transport)} aria-describedby={`participant-transport-notice${errors.transport ? " participant-transport-error" : ""}`} className={`${styles.input} ${styles.select}`} {...register("transport")}>
            <option value="" disabled>Select your preference</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
          {errors.transport && <p id="participant-transport-error" role="alert" className={styles.fieldError}>{errors.transport.message}</p>}
        </div>
        {error && <p role="alert" className={`${styles.serverError} ${styles.full}`}>{error}</p>}
        <button type="submit" disabled={isSubmitting} className={`${styles.submit} ${styles.full}`}>
          <span>{isSubmitting ? "Submitting…" : `${isPreReg ? "Pre-register" : "Register"} for ${slug === "ugx" ? "UGX" : "HNC"}`}</span>
          <span>{isSubmitting ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <ArrowUpRight size={18} aria-hidden="true" />}</span>
        </button>
      </fieldset>
      <p id="participant-transport-notice" className={styles.transportNotice}>{TRANSPORT_NOTICE}</p>
      <p className={styles.privacy}>One registration per CNIC for this event.<br />Your details are used to manage your event registration.</p>
    </form>
  );
}
