"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { heroRevealVariant, staggerContainerVariant, DURATION, EASE } from "@/lib/motion";
import { uiSounds } from "@/lib/audio";
import Link from "next/link";
import { AMBASSADOR_CAMPAIGN } from "@/lib/ambassadors";

// Use Lenis if available, fall back to native smooth scroll
function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const lenis = (window as unknown as Record<string, unknown>).__lenis as
    | { scrollTo: (target: HTMLElement, opts: { offset: number; duration: number }) => void }
    | undefined;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Hero({ ambassadorCallOpen = false }: { ambassadorCallOpen?: boolean }) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    // Show the scroll indicator regardless of whether the video plays,
    // fails to load, or autoplay is blocked — never let it hinge on
    // video playback succeeding.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVideoReady(true);

    if (!video) return;

    // Safari requires direct play() call
    video.play().catch(() => {
      // Autoplay blocked — content is still shown via setVideoReady above
    });
  }, []);

  // Scroll indicator click → smooth scroll to next section
  const scrollDown = () => {
    scrollTo("cinematic-bridge");
  };

  return (
    <section
      id="hero"
      className="relative w-full h-[100svh] min-h-[600px] overflow-hidden flex items-center justify-center"
      aria-label="Hero — NETRONiX Network Awakens"
    >
      {/* ── Background Video ────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src="/assets/videos/hero-network-awakens.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
        className="absolute inset-0 w-full h-full object-cover"
        style={{ backgroundColor: "#050505" }}
        aria-hidden="true"
      />



      {/* ── Gradient Overlay — top darkens video slightly, bottom fades to pure black ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(5,5,5,0.35) 0%, rgba(5,5,5,0.05) 30%, rgba(5,5,5,0.0) 50%, rgba(5,5,5,0.5) 70%, rgba(5,5,5,0.9) 88%, #050505 100%)",
        }}
        aria-hidden="true"
      />

      {/* ── Hero Content ─────────────────────────────────────────────────── */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl mx-auto"
            variants={staggerContainerVariant(0.15)}
            initial="hidden"
            animate="visible"
            transition={{ delayChildren: 0.3 }}
          >


            {/* Main heading */}
            <motion.h1
              variants={heroRevealVariant}
              className="font-heading font-semibold mb-6 text-balance"
              style={{
                fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                color: "#FFFFFF",
              }}
            >
              Powering GIKI&apos;s{" "}
              <br className="md:hidden" />
              <span style={{ color: "#E11D2E" }}>Digital</span>{" "}
              Infrastructure
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={heroRevealVariant}
              className="max-w-xl text-base md:text-lg leading-relaxed mb-10"
              style={{ color: "#B3B3B3" }}
            >
              The digital backbone of GIKI&apos;s technical infrastructure and gaming community.
            We build the systems that connect, and the experiences that unite.
            </motion.p>

            {ambassadorCallOpen && (
              <motion.div variants={heroRevealVariant} className="mb-7">
                <Link href="/ambassadors" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#60A5FA]/40 bg-[#071326]/90 px-4 py-2 text-center text-xs font-medium text-[#BFDBFE] transition-colors hover:border-[#60A5FA] sm:text-sm">
                  HNC &amp; UGX · {AMBASSADOR_CAMPAIGN.dates} · Ambassador call open →
                </Link>
              </motion.div>
            )}

            {/* CTAs */}
            <motion.div
              variants={heroRevealVariant}
              className="flex flex-col sm:flex-row gap-3 items-center"
            >
              <motion.a
                href="#events"
                onMouseEnter={uiSounds.playHover}
                onClick={(e) => {
                  e.preventDefault();
                  uiSounds.playClick();
                  scrollTo("events");
                }}
                className="px-6 py-3 rounded-full text-sm font-semibold transition-all"
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#050505",
                  letterSpacing: "-0.01em",
                }}
                whileHover={{ backgroundColor: "#E5E5E5", scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                aria-label="Explore NETRONiX events"
              >
                Explore Events
              </motion.a>

              <motion.a
                href="#portal"
                onMouseEnter={uiSounds.playHover}
                onClick={(e) => {
                  e.preventDefault();
                  uiSounds.playClick();
                  scrollTo("portal");
                }}
                className="px-6 py-3 rounded-full text-sm font-semibold transition-all"
                style={{
                  backgroundColor: "#E11D2E",
                  color: "#FFFFFF",
                }}
                whileHover={{
                  backgroundColor: "#FF3B4D",
                  scale: 1.02,
                }}
                whileTap={{ scale: 0.97 }}
                aria-label="Report a network issue"
              >
                Report Network Issue
              </motion.a>
            </motion.div>
          </motion.div>

      {/* ── Scroll indicator ─────────────────────────────────────────────── */}
      <motion.button
        type="button"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer"
        initial={{ opacity: 0, y: 8 }}
        animate={videoReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ delay: 1.2, duration: DURATION.section, ease: EASE.elegant }}
        onMouseEnter={uiSounds.playHover}
        onClick={() => {
          uiSounds.playClick();
          scrollDown();
        }}
        aria-label="Scroll down to explore"
      >
        <span className="font-mono text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}>
          Scroll
        </span>
        <motion.div
          className="w-px h-8 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          animate={{ scaleY: [1, 0.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        />
      </motion.button>
    </section>
  );
}
