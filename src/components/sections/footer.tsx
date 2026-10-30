"use client";

import { SectionWrapper, SectionItem } from "@/components/ui/section-wrapper";
import { NetworkLines } from "@/components/ui/network-lines";
import { BrandLogo } from "@/components/ui/brand-logo";

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

// ─── Nav columns ─────────────────────────────────────────────────────────────

const FOOTER_NAV = [
  {
    heading: "Society",
    links: [
      { label: "About",   href: "#about"   },
      { label: "Team",    href: "#"        },
      { label: "Contact", href: "https://www.instagram.com/netronixgiki/?hl=en" },
    ],
  },
  {
    heading: "Events",
    links: [
      { label: "UGX",            href: "#events" },
      { label: "Hack n Connect", href: "#events" },
      { label: "Volunteer Call", href: "#events" },
      { label: "Inductions",     href: "#events" },
    ],
  },
  {
    heading: "Portal",
    links: [
      { label: "Complaint Portal", href: "#portal"    },
      { label: "Gallery",          href: "#community" },
    ],
  },
] as const;

const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/netronixgiki/?hl=en", icon: InstagramIcon },
  { label: "LinkedIn",  href: "https://www.linkedin.com/company/netronixgiki/", icon: LinkedInIcon  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer
      id="footer"
      aria-label="Site footer — Network Core"
      className="px-4 pb-4 pt-0"
    >
      {/* Large rounded container */}
      <div
        className="w-full rounded-3xl overflow-hidden relative"
        style={{
          backgroundColor: "#0D0D0D",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <SectionWrapper className="flex flex-col" delay={0.05}>

          <SectionItem>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 px-8 pt-16 pb-32 z-10 relative">

              {/* ── LEFT: Network Core Card ─────────────────────────────── */}
              <div className="lg:col-span-4 z-10 relative">
                <div
                  className="relative rounded-2xl overflow-hidden p-7 h-full min-h-[240px] flex flex-col justify-between"
                  style={{
                    backgroundColor: "#141414",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {/* Animated network lines (behind everything) */}
                  <div className="absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
                    <NetworkLines />
                  </div>

                  {/* Card content */}
                  <div className="relative z-10">
                    {/* Logo / wordmark */}
                    <div className="mb-6">
                      <BrandLogo name="netronix" className="w-40" />
                    </div>

                    <p
                      className="font-heading font-semibold text-base leading-snug mb-3"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      Powering GIKI&apos;s Digital Infrastructure
                    </p>

                    <p className="text-xs leading-relaxed" style={{ color: "#666666" }}>
                      Student-managed campus network and events society at Ghulam
                      Ishaq Khan Institute of Engineering Sciences and Technology.
                    </p>
                  </div>

                  {/* Network Online status */}
                  <div className="relative z-10 flex items-center gap-2.5 mt-8">
                    <span
                      className="w-2 h-2 rounded-full animate-pulse-red"
                      style={{ backgroundColor: "#E11D2E" }}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-xs" style={{ color: "#B3B3B3", letterSpacing: "0.06em" }}>
                      Network Online
                    </span>
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Navigation columns ───────────────────────────── */}
              <div className="lg:col-span-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                  {FOOTER_NAV.map((col) => (
                    <div key={col.heading} className="flex flex-col gap-4">
                      <h3
                        className="font-mono text-xs uppercase tracking-widest"
                        style={{ color: "#E11D2E", letterSpacing: "0.12em" }}
                      >
                        {col.heading}
                      </h3>
                      <ul className="flex flex-col gap-2.5" role="list">
                        {col.links.map((link) => (
                          <li key={link.label} role="listitem">
                            <a
                              href={link.href}
                              onClick={(e) => {
                                if (link.href.startsWith("#")) {
                                  e.preventDefault();
                                  const id = link.href.substring(1);
                                  if (id) scrollTo(id);
                                }
                              }}
                              target={link.href.startsWith("http") ? "_blank" : undefined}
                              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                              className="text-sm transition-colors duration-[250ms] hover:text-white"
                              style={{ color: "#666666" }}
                            >
                              {link.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionItem>


          {/* ── Bottom bar ──────────────────────────────────────────────── */}
          <SectionItem>
            <div
              className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-6 border-t mt-12"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              {/* Copyright */}
              <p className="font-mono text-xs" style={{ color: "#444" }}>
                © {new Date().getFullYear()} NETRONiX, GIKI. All rights reserved.
              </p>

              {/* Social icons */}
              <div className="flex items-center gap-4" role="list" aria-label="Social media links">
                {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    role="listitem"
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="transition-colors duration-[250ms] hover:text-white w-10 h-10 flex items-center justify-center"
                    style={{ color: "#444" }}
                  >
                    <Icon />
                  </a>
                ))}
              </div>

              {/* Right side */}
              <div className="flex items-center gap-6">
                <span className="font-mono text-xs" style={{ color: "#444" }}>
                  Made by NETRONiX
                </span>
                <button
                  onClick={scrollToTop}
                  className="font-mono text-xs transition-colors duration-[250ms] hover:text-white flex items-center gap-1"
                  style={{ color: "#444" }}
                  aria-label="Back to top"
                >
                  ↑ Top
                </button>
              </div>
            </div>
          </SectionItem>

          {/* ── Giant NETRONiX Wordmark (Absolute Bottom) ──────────────── */}
          <div
            className="absolute bottom-0 left-0 right-0 overflow-hidden select-none pointer-events-none z-0 flex items-end justify-center"
            style={{ height: "100%" }}
            aria-hidden="true"
          >
            <div className="w-[92%] translate-y-[28%] opacity-[0.06]">
              <BrandLogo name="netronix" className="w-full" />
            </div>
          </div>

        </SectionWrapper>
      </div>
    </footer>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  );
}
