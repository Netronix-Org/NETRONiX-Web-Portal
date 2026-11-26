"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * CinematicBridge
 *
 * Transition component between Hero and About.
 * When the video ends the section fades out and collapses smoothly
 * via a CSS height transition — no black overlay, no scroll jump.
 * The About section slides naturally into view as the gap closes.
 */
export function CinematicBridge() {
  const sectionRef  = useRef<HTMLDivElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const playedRef   = useRef(false);

  const [videoFaded,  setVideoFaded]  = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);

  // ── Step 1: IntersectionObserver — trigger playback once ─────────────────
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || playedRef.current) return;

        const video = videoRef.current;

        // Safety net: if video never plays after 3 s, quietly collapse
        fallbackTimer = setTimeout(() => {
          if (!playedRef.current) {
            playedRef.current = true;
          }
        }, 3000);

        if (!video) return;

        video
          .play()
          .then(() => {
            playedRef.current = true;
            if (fallbackTimer) clearTimeout(fallbackTimer);
            setVideoFaded(true);
          })
          .catch(() => {
            playedRef.current = true;
            if (fallbackTimer) clearTimeout(fallbackTimer);
          });

        observer.disconnect();
      },
      { threshold: 0.35, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  // ── Step 2: Show logo overlay near the end of the video ──────────────────
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video?.duration) return;
    if (!logoVisible && video.currentTime / video.duration > 0.72) {
      setLogoVisible(true);
    }
  }, [logoVisible]);

  return (
    <section
      ref={sectionRef}
      id="cinematic-bridge"
      aria-hidden="true"
      className="relative w-full overflow-hidden"
      style={{
        height: "48vh",
        minHeight: "320px",
        pointerEvents: "none",
      }}
    >
      {/* Dark background */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "#050505", zIndex: 0 }}
      />

      {/* ── Video ─────────────────────────────────────────────────────────── */}
      <motion.video
        ref={videoRef}
        src="/assets/videos/hero-signal-logo-transition.mp4"
        muted
        playsInline
        preload="none"
        poster="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 1, backgroundColor: "#050505" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: videoFaded ? 1 : 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* ── Top gradient — blends from hero's black bottom ────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "30%",
          background: "linear-gradient(to bottom, #050505 0%, rgba(5,5,5,0.7) 40%, transparent 100%)",
          zIndex: 2,
        }}
      />

      {/* ── Bottom gradient — fades into About section ────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "35%",
          background: "linear-gradient(to top, #050505 0%, rgba(5,5,5,0.6) 50%, transparent 100%)",
          zIndex: 2,
        }}
      />

      {/* ── NETRONiX Logo Overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {logoVisible && (
          <motion.div
            key="logo-overlay"
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{
              zIndex: 10,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              backgroundColor: "rgba(5,5,5,0.45)",
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Wordmark */}
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.0, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily:    "var(--font-clash-grotesk), sans-serif",
                fontWeight:    700,
                fontSize:      "clamp(3.5rem, 12vw, 8rem)",
                letterSpacing: "0.02em",
                color:         "#FFFFFF",
                lineHeight:    1,
                margin:        0,
                textShadow:    "0 0 60px rgba(225,29,46,0.3), 0 0 20px rgba(225,29,46,0.5)",
              }}
            >
              NETRONiX
            </motion.h2>

            {/* Red accent underline */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width:           "120px",
                height:          "2px",
                backgroundColor: "#E11D2E",
                marginTop:       "1.5rem",
                borderRadius:    "9999px",
                transformOrigin: "center",
                filter:          "drop-shadow(0 0 6px rgba(225,29,46,0.8))",
              }}
            />

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              style={{
                fontFamily:    "Inter, sans-serif",
                fontSize:      "1rem",
                fontWeight:    500,
                color:         "rgba(255,255,255,0.9)",
                marginTop:     "1.5rem",
                letterSpacing: "0.02em",
                textShadow:    "0 2px 10px rgba(0,0,0,0.8)",
              }}
            >
              Powering GIKI&apos;s Digital Infrastructure
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
