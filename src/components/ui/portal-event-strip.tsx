import { CalendarDays } from "lucide-react";
import { AMBASSADOR_CAMPAIGN } from "@/lib/ambassadors";
import { BrandLogo } from "./brand-logo";

export function PortalEventStrip() {
  return (
    <section
      aria-label="About NETRONiX and the events"
      className="overflow-hidden rounded-xl border border-white/15 bg-[#101014] lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,2fr)]"
    >
      <div className="p-5 sm:p-6">
        <p className="inline-flex flex-wrap items-center gap-2 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-[#E5E8EF]">
          <CalendarDays size={14} aria-hidden="true" />
          {AMBASSADOR_CAMPAIGN.dates} {AMBASSADOR_CAMPAIGN.year} · GIKI
        </p>
        <h2 className="mt-4 max-w-[22ch] text-balance font-heading text-2xl font-semibold leading-tight">Bring your ideas. Bring your A-game.</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#B3B3B3]">NETRONiX runs GIKI’s campus network and brings students together through tech and gaming.</p>
      </div>

      <div className="grid border-t border-white/15 sm:grid-cols-2 lg:border-t-0 lg:border-l">
        <article className="border-l-2 border-[#6CA8FF] bg-[#121923] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <BrandLogo name="hnc" className="w-14" />
            <h3 className="text-base font-semibold text-[#B9D8FF]">HNC · Hack n’ Connect</h3>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-[#D0D8E6]">Meet the speakers at Connect Talks and build a prototype with your team at Venturethon.</p>
        </article>
        <article className="border-l-2 border-[#FF6B79] bg-[#211519] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <BrandLogo name="ugx" className="w-[2.875rem]" />
            <h3 className="text-base font-semibold text-[#FFB3BB]">UGX · Uber.Game X</h3>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-[#E2CDD1]">Take the pitch in FC26 or step into the arena in Tekken 8.</p>
        </article>
      </div>
    </section>
  );
}
