"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";

/** Public pages use momentum scrolling; portals retain native scrolling. */
export function SmoothScroll() {
  const pathname = usePathname();
  const useNativeScroll =
    pathname === "/admin" ||
    pathname?.startsWith("/admin/") ||
    pathname === "/participants/portal" ||
    pathname === "/ambassadors/portal";

  useEffect(() => {
    if (useNativeScroll || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let lenis: Lenis | undefined;
    let rafId = 0;

    // Portal routes use native scrolling and never need this download.
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({
        duration: 1.4,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.8,
        infinite: false,
      });

      function raf(time: number) {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);

      // Allow navigation and hero links to use the active scroll instance.
      (window as unknown as Record<string, unknown>).__lenis = lenis;
    }).catch(() => {
      // Native scrolling remains available if the optional chunk fails to load.
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      lenis?.destroy();
      delete (window as unknown as Record<string, unknown>).__lenis;
    };
  }, [useNativeScroll]);

  return null;
}
