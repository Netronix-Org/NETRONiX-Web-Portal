import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  effectiveStatus,
  isRegistrationOpen,
  isPreRegistration,
  STATUS_LABEL,
  VOLUNTEER_CALL_SLUG,
} from "@/lib/events";
import { RegistrationForm } from "@/components/forms/registration-form";
import { VolunteerRegistrationForm } from "@/components/forms/volunteer-registration-form";
import type { Event } from "@prisma/client";
import { fetchEventBySlug } from "@/lib/events-data";

// Registration state depends on the clock and on admin edits, so never cache.
export const dynamic = "force-dynamic";

async function getEvent(slug: string): Promise<Event | null> {
  return await fetchEventBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) return { title: "Register — NETRONiX" };

  const isPreReg = isPreRegistration(event);
  const prefix = isPreReg ? "Pre-Register" : "Register";

  return {
    title: `${prefix} — ${event.title} | NETRONiX`,
    description: event.description,
    robots: { index: false, follow: true },
  };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) notFound();

  const status = effectiveStatus(event);
  const open = isRegistrationOpen(event);
  const isPreReg = isPreRegistration(event);

  return (
    <main
      className="min-h-screen w-full px-4 md:px-8 py-16 md:py-24"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-10">
        {/* ── Back link ────────────────────────────────────────────────── */}
        <Link
          href="/#events"
          className="font-mono text-xs uppercase tracking-widest transition-colors hover:text-white w-fit"
          style={{ color: "#666666", letterSpacing: "0.12em" }}
        >
          ← Back to events
        </Link>

        {/* ── Event header ─────────────────────────────────────────────── */}
        <header className="flex flex-col gap-5">
          {event.imageSrc && (
            <div
              className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden border"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <Image
                src={event.imageSrc}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(10,10,10,0.9), transparent 60%)",
                }}
              />
            </div>
          )}

          <div className="flex flex-col gap-3">
            {isPreReg ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium border w-fit"
                style={{
                  color: "#38BDF8",
                  backgroundColor: "rgba(56,189,248,0.12)",
                  borderColor: "rgba(56,189,248,0.3)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
                ⚡ PRE-REGISTRATION OPEN · EVENT COMING SOON
              </div>
            ) : event.subtitle ? (
              <p
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: "#E11D2E", letterSpacing: "0.12em" }}
              >
                {event.subtitle}
              </p>
            ) : null}

            <h1
              className="font-heading font-semibold"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.25rem)",
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
              }}
            >
              {isPreReg ? `Pre-Register: ${event.title}` : event.title}
            </h1>

            <p className="text-base leading-relaxed" style={{ color: "#B3B3B3" }}>
              {isPreReg
                ? `${event.description} Submit your pre-registration below to secure early access and priority entry.`
                : event.description}
            </p>
          </div>
        </header>

        {/* ── Form, or a closed-state notice ───────────────────────────── */}
        {open ? (
          <>
            {event.formIntro && (
              <p
                className="text-sm leading-relaxed border-l-2 pl-4"
                style={{ color: "#B3B3B3", borderColor: isPreReg ? "#38BDF8" : "#E11D2E" }}
              >
                {event.formIntro}
              </p>
            )}

            {event.slug === VOLUNTEER_CALL_SLUG ? (
              <VolunteerRegistrationForm slug={event.slug} eventTitle={event.title} isPreReg={isPreReg} />
            ) : (
              <RegistrationForm slug={event.slug} eventTitle={event.title} isPreReg={isPreReg} />
            )}
          </>
        ) : (
          <div
            className="rounded-2xl border p-8 flex flex-col gap-3"
            style={{
              backgroundColor: "#141414",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <p
              className="font-mono text-xs uppercase tracking-widest"
              style={{ color: "#666666", letterSpacing: "0.12em" }}
            >
              {STATUS_LABEL[status]}
            </p>

            <h2 className="font-heading font-semibold text-xl">
              {status === "past"
                ? "This event has concluded"
                : "Registration is not open yet"}
            </h2>

            <p className="text-sm leading-relaxed" style={{ color: "#B3B3B3" }}>
              {status === "past"
                ? "Thanks to everyone who took part. Keep an eye on the events page for what comes next."
                : "This event goes live soon. Check back on the events page, or follow NETRONiX for the announcement."}
            </p>

            <Link
              href="/#events"
              className="mt-3 inline-flex items-center justify-center w-fit py-2.5 px-5 rounded-lg text-sm font-medium border transition-colors hover:bg-white/[0.03]"
              style={{
                borderColor: "rgba(225,29,46,0.4)",
                color: "#FFFFFF",
              }}
            >
              See all events →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
