"use client";

import { useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Node { x: number; y: number }
interface Edge { from: Node; to: Node }

// ─── Network topology (fixed for reproducibility) ────────────────────────────

const NODES: Node[] = [
  { x: 60,  y: 40  },
  { x: 160, y: 20  },
  { x: 240, y: 80  },
  { x: 140, y: 120 },
  { x: 40,  y: 130 },
  { x: 220, y: 160 },
  { x: 100, y: 180 },
  { x: 290, y: 50  },
];

const EDGES: Edge[] = [
  { from: NODES[0], to: NODES[1] },
  { from: NODES[1], to: NODES[2] },
  { from: NODES[2], to: NODES[3] },
  { from: NODES[3], to: NODES[0] },
  { from: NODES[3], to: NODES[4] },
  { from: NODES[2], to: NODES[5] },
  { from: NODES[5], to: NODES[6] },
  { from: NODES[6], to: NODES[4] },
  { from: NODES[1], to: NODES[7] },
  { from: NODES[7], to: NODES[2] },
];

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Subtle animated network topology behind the Network Core card.
 * GSAP is loaded lazily so it doesn't block the initial bundle.
 * Animates one red signal dot per edge every 5–8 seconds.
 */
export function NetworkLines() {
  const svgRef  = useRef<SVGSVGElement>(null);
  const dotsRef = useRef<(SVGCircleElement | null)[]>([]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let cancelled = false;
    let visible = false;
    let gsap: (typeof import("gsap"))["gsap"] | undefined;
    let loading: Promise<unknown> | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const active = new Map<SVGCircleElement, { kill: () => void }>();
    const shouldAnimate = () => !cancelled && visible && !document.hidden && !reducedMotion.matches;

    function scheduleSignal(dot: SVGCircleElement, edge: Edge, delay: number) {
      if (!gsap || !shouldAnimate()) return;
      const timeline = gsap.timeline({
        delay,
        onComplete: () => {
          active.delete(dot);
          scheduleSignal(dot, EDGES[Math.floor(Math.random() * EDGES.length)], 5 + Math.random() * 3);
        },
      });
      timeline.fromTo(dot,
        { attr: { cx: edge.from.x, cy: edge.from.y }, opacity: 0 },
        { attr: { cx: edge.to.x, cy: edge.to.y }, opacity: 1, duration: 1.8, ease: "power2.inOut" },
      ).to(dot, { opacity: 0, duration: 0.3 });
      active.set(dot, timeline);
    }

    function start() {
      if (!shouldAnimate() || active.size) return;
      EDGES.forEach((edge, i) => {
        const dot = dotsRef.current[i];
        if (dot) scheduleSignal(dot, edge, i * 0.9 + Math.random() * 2);
      });
    }

    function syncAnimation() {
      if (!shouldAnimate()) {
        active.forEach((timeline, dot) => {
          timeline.kill();
          dot.style.opacity = "0";
        });
        active.clear();
        return;
      }
      if (gsap) start();
      // Download the optional animation library only when the footer is visible.
      else if (!loading) {
        loading = import("gsap").then((module) => {
          gsap = module.gsap;
          start();
        }).catch(() => { loading = undefined; });
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio > 0;
      syncAnimation();
    }, { threshold: 0.001 });
    observer.observe(svg);
    document.addEventListener("visibilitychange", syncAnimation);
    reducedMotion.addEventListener("change", syncAnimation);

    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncAnimation);
      reducedMotion.removeEventListener("change", syncAnimation);
      active.forEach((timeline) => timeline.kill());
      active.clear();
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 320 200"
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.35 }}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Static network edges */}
      {EDGES.map((edge, i) => (
        <line
          key={`edge-${i}`}
          x1={edge.from.x} y1={edge.from.y}
          x2={edge.to.x}   y2={edge.to.y}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.8"
        />
      ))}

      {/* Static nodes */}
      {NODES.map((node, i) => (
        <circle
          key={`node-${i}`}
          cx={node.x} cy={node.y} r="2"
          fill="rgba(255,255,255,0.15)"
        />
      ))}

      {/* Animated signal dots — one per edge */}
      {EDGES.map((edge, i) => (
        <circle
          key={`dot-${i}`}
          ref={(el) => { dotsRef.current[i] = el; }}
          cx={edge.from.x} cy={edge.from.y}
          r="2.5"
          fill="#E11D2E"
          style={{
            filter: "drop-shadow(0 0 3px #FF3B4D)",
            opacity: 0,
          }}
        />
      ))}
    </svg>
  );
}
