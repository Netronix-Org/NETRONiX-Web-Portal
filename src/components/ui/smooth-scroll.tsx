"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * SmoothScroll
 *
 * Initialises Lenis — the smooth-scroll library that was already installed
 * but never wired up. Lenis intercepts native scroll events and replaces
 * them with momentum-based easing, giving the site a premium inertial feel.
 *
 * Must be rendered inside a Client Component tree. Mount it once at the
 * root (layout.tsx or page.tsx) so it covers the entire page.
 *
 * Integration with Framer Motion:
 * Lenis exposes an onScroll callback that we use to sync Framer Motion's
 * scroll tracker, so whileInView and useScroll hooks still work correctly.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const useNativeScroll =
    pathname === "/admin" ||
    pathname?.startsWith("/admin/") ||
    pathname === "/participants/portal" ||
    pathname === "/ambassadors/portal";

  useEffect(() => {
    if (useNativeScroll) return;

    const lenis = new Lenis({
      duration: 1.4,           // scroll inertia in seconds (higher = smoother)
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
      smoothWheel: true,
      wheelMultiplier: 0.9,    // slightly slower on mouse wheel = more control
      touchMultiplier: 1.8,    // slightly faster on touch = feels responsive
      infinite: false,
    });

    // Tick Lenis on every animation frame
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Expose lenis on window so other components can call lenis.scrollTo()
    // if needed (e.g. the nav's scrollTo helper could use it)
    (window as unknown as Record<string, unknown>).__lenis = lenis;

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete (window as unknown as Record<string, unknown>).__lenis;
    };
  }, [useNativeScroll]);

  return null;
}
