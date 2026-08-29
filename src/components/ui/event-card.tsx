"use client";

import { motion } from "framer-motion";
import { scaleInVariant, DURATION } from "@/lib/motion";
import Image from "next/image";
import Link from "next/link";

/** next/link with framer-motion's hover/tap props, for client-side navigation. */
const MotionLink = motion.create(Link);

/** Mirrors the `event_status` enum in the database. */
export type EventStatus = "live" | "coming_soon" | "past";

interface EventCardProps {
  title: string;
  subtitle?: string;
  description: string;
  status: EventStatus;
  /** True when event is in Coming Soon state but accepting pre-registrations */
  isPreReg?: boolean;
  /** Custom button label (e.g. "Pre-Register →" vs "Register →") */
  buttonLabel?: string;
  /**
   * Registration form URL. Passed when the event is open for registrations or pre-registrations.
   */
  registerHref?: string;
  /** Optional aspect ratio class, defaults to "aspect-video" */
  aspectClass?: string;
  /** Placeholder color for the image area */
  accentColor?: string;
  /** Icon or short label shown in image placeholder */
  imagePlaceholder?: string;
  /** Image source path to display */
  imageSrc?: string;
}

const STATUS_CONFIG = {
  live:        { label: "Live Now",     color: "#E11D2E", bg: "rgba(225,29,46,0.15)"  },
  coming_soon: { label: "Coming Soon",  color: "#FFFFFF", bg: "rgba(255,255,255,0.08)" },
  past:        { label: "Concluded",    color: "#666666", bg: "rgba(255,255,255,0.05)" },
} as const;

export function EventCard({
  title,
  subtitle,
  description,
  status,
  isPreReg = false,
  buttonLabel,
  registerHref,
  aspectClass = "aspect-video",
  accentColor = "#1A1A1A",
  imagePlaceholder,
  imageSrc,
}: EventCardProps) {
  const statusCfg = STATUS_CONFIG[status];

  return (
    <motion.article
      variants={scaleInVariant}
      className="group relative flex flex-col rounded-2xl overflow-hidden border hover-red-glow"
      style={{ backgroundColor: "#141414", borderColor: "rgba(255,255,255,0.08)" }}
      whileHover={{ y: -6, transition: { duration: DURATION.card, ease: [0.16, 1, 0.3, 1] } }}
    >
      {/* ── Image / Placeholder ──────────────────────────────────────────── */}
      <div
        className={`relative ${aspectClass} overflow-hidden flex items-center justify-center`}
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt=""
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : imagePlaceholder ? (
          <span
            className="font-heading font-bold tracking-tight select-none pointer-events-none z-10"
            style={{
              fontSize: "clamp(1.5rem, 5vw, 3rem)",
              color: "rgba(255,255,255,0.12)",
              letterSpacing: "-0.03em",
            }}
          >
            {imagePlaceholder}
          </span>
        ) : null}

        {/* Gradient fade at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1/2"
          style={{ background: `linear-gradient(to top, ${accentColor}, transparent)` }}
        />
      </div>

      {/* Status badge — outside aria-hidden so screen readers announce it */}
      <div className="absolute top-3 left-3 z-10">
        {isPreReg ? (
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
              aria-hidden="true"
            />
            Coming Soon · Pre-Reg Open
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
          >
            {status === "live" && (
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-red"
                style={{ backgroundColor: "#E11D2E" }}
                aria-hidden="true"
              />
            )}
            {statusCfg.label}
          </span>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 gap-3 p-5">
        {subtitle && (
          <p
            className="font-mono text-xs uppercase tracking-widest"
            style={{ color: isPreReg ? "#38BDF8" : "#E11D2E", letterSpacing: "0.12em" }}
          >
            {subtitle}
          </p>
        )}
        <h3
          className="font-heading font-semibold text-lg leading-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed flex-1" style={{ color: "#B3B3B3" }}>
          {description}
        </p>

        {/* Register button — active when registerHref is provided */}
        {registerHref ? (
          <MotionLink
            href={registerHref}
            className="mt-2 inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg text-sm font-medium border transition-all duration-[250ms]"
            style={{
              borderColor: isPreReg ? "rgba(56,189,248,0.4)" : "rgba(225,29,46,0.4)",
              color: "#FFFFFF",
            }}
            whileHover={{
              backgroundColor: isPreReg ? "rgba(56,189,248,0.12)" : "rgba(225,29,46,0.12)",
              borderColor: isPreReg ? "rgba(56,189,248,0.7)" : "rgba(225,29,46,0.7)",
            }}
            whileTap={{ scale: 0.98 }}
            aria-label={`${buttonLabel ?? (isPreReg ? "Pre-Register for" : "Register for")} ${title}`}
          >
            {buttonLabel ?? (isPreReg ? "Pre-Register →" : "Register →")}
          </MotionLink>
        ) : status === "past" ? (
          <div
            className="mt-2 w-full py-2.5 px-4 rounded-lg text-sm font-medium text-center"
            style={{ color: "#666666", backgroundColor: "rgba(255,255,255,0.03)" }}
          >
            Concluded
          </div>
        ) : (
          <div
            className="mt-2 w-full py-2.5 px-4 rounded-lg text-sm font-medium text-center border"
            style={{ borderColor: "rgba(255,255,255,0.08)", color: "#666666" }}
            title="Registration link coming soon"
          >
            Coming Soon
          </div>
        )}
      </div>
    </motion.article>
  );
}
