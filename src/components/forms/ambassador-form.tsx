"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react";
import { AmbassadorSchema, type AmbassadorInput } from "@/lib/validation/ambassador";
import type { z } from "zod";

const FIELDS = [
  { name: "fullName", label: "Ambassador's name", type: "text", autoComplete: "name", placeholder: "Your full name", maxLength: 100 },
  { name: "cnic", label: "CNIC", type: "text", autoComplete: "off", placeholder: "12345-1234567-1", maxLength: 15, hint: "13 digits, with or without dashes." },
  { name: "phone", label: "Phone number", type: "tel", autoComplete: "tel", placeholder: "03XX XXXXXXX", maxLength: 25 },
  { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com", maxLength: 150 },
  { name: "university", label: "University", type: "text", autoComplete: "organization", placeholder: "Your university's full name", maxLength: 200 },
  { name: "participantCount", label: "Expected participants", type: "number", autoComplete: "off", placeholder: "e.g. 20", hint: "Your best estimate for HNC & UGX combined." },
] as const;

export function AmbassadorForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<AmbassadorInput, unknown, z.output<typeof AmbassadorSchema>>({
    resolver: zodResolver(AmbassadorSchema),
  });

  async function submit(values: z.output<typeof AmbassadorSchema>) {
    setError(null);
    try {
      const response = await fetch("/api/ambassadors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.errors) {
          for (const field of FIELDS) {
            const message = data.errors[field.name]?.[0];
            if (message) setFieldError(field.name, { type: "server", message }, { shouldFocus: true });
          }
        }
        setError(data.message || "We couldn't save your application. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Couldn't connect. Check your connection and try again; your details are still here.");
    }
  }

  if (submitted) {
    return (
      <div ref={(node) => { node?.focus(); }} tabIndex={-1} role="status" className="rounded-2xl border border-[#3B82F6]/30 bg-[#0D1523] p-7 sm:p-9">
        <CheckCircle2 size={36} className="mb-6 text-[#60A5FA]" aria-hidden="true" />
        <h2 className="font-heading text-3xl font-semibold">You&apos;re on the list.</h2>
        <p className="mt-4 text-sm leading-relaxed text-[#C4D1E5]">Your ambassador application for HNC &amp; UGX has been received. The NETRONiX team will contact you on the phone number you provided.</p>
        <Link href="/#ambassadors" className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white underline underline-offset-4">Back to NETRONiX<ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="rounded-2xl border border-white/10 bg-[#101010] p-6 sm:p-9" aria-labelledby="application-heading">
      <h2 id="application-heading" className="font-heading text-2xl font-semibold">Become an ambassador</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#B3B3B3]">One application. Both events. All fields are required.</p>
      <fieldset disabled={isSubmitting} className="mt-8 flex min-w-0 flex-col gap-5 disabled:opacity-70">
        <legend className="sr-only">Ambassador details</legend>
        {FIELDS.map((field) => {
          const message = errors[field.name]?.message;
          const hint = "hint" in field ? field.hint : undefined;
          return (
            <div key={field.name} className="flex flex-col gap-2">
              <label htmlFor={`ambassador-${field.name}`} className="text-sm font-medium text-[#E5E5E5]">{field.label}</label>
              <input
                id={`ambassador-${field.name}`}
                type={field.type}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                maxLength={"maxLength" in field ? field.maxLength : undefined}
                min={field.type === "number" ? 1 : undefined}
                max={field.type === "number" ? 10000 : undefined}
                step={field.type === "number" ? 1 : undefined}
                inputMode={field.name === "cnic" || field.type === "number" ? "numeric" : undefined}
                required
                aria-invalid={Boolean(message)}
                aria-describedby={[hint ? `${field.name}-hint` : "", message ? `${field.name}-error` : ""].filter(Boolean).join(" ") || undefined}
                className="min-h-12 w-full rounded-lg border border-white/15 bg-[#080808] px-4 py-3 text-base text-white caret-[#60A5FA] placeholder:text-[#858585] focus:border-[#60A5FA] focus:outline-2 focus:outline-offset-2 focus:outline-[#60A5FA] aria-invalid:border-[#FF6B79]"
                {...register(field.name, field.type === "number" ? { valueAsNumber: true } : {})}
              />
              {hint && <p id={`${field.name}-hint`} className="text-xs leading-relaxed text-[#999999]">{hint}</p>}
              {message && <p id={`${field.name}-error`} role="alert" className="text-sm text-[#FF8B96]">{message}</p>}
            </div>
          );
        })}
        {error && <p role="alert" className="rounded-lg border border-[#FF6B79]/30 bg-[#E11D2E]/10 p-4 text-sm leading-relaxed text-[#FFB3BB]">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="mt-1 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-[#E11D2E] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#C91829] disabled:cursor-wait">
          {isSubmitting ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" />Submitting application…</> : <>Submit ambassador application<ArrowUpRight size={18} aria-hidden="true" /></>}
        </button>
      </fieldset>
      <p className="mt-5 text-xs leading-relaxed text-[#999999]">NETRONiX uses these details to coordinate your application. Your CNIC is only available to executive admins.</p>
    </form>
  );
}
