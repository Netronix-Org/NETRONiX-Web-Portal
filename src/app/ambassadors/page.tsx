import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, MapPin, Phone } from "lucide-react";
import { AmbassadorIdentity } from "@/components/ui/ambassador-identity";
import { AmbassadorForm } from "@/components/forms/ambassador-form";
import { BrandLogo } from "@/components/ui/brand-logo";
import { AMBASSADOR_CAMPAIGN, isAmbassadorCallOpen } from "@/lib/ambassadors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HNC & UGX Ambassador Call",
  description: "Represent your university at HNC & UGX, 11–13 December at GIKI. Apply to become a NETRONiX ambassador.",
};

// Extend the established black, red and blue visual system. Keep event details
// beside the application form, with the application immediately visible on desktop.
export default function AmbassadorsPage() {
  const open = isAmbassadorCallOpen();

  return (
    <main id="main-content" className="min-h-screen bg-[#050505] px-4 pb-16 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 py-6">
          <Link href="/" aria-label="NETRONiX — home" className="inline-flex min-h-11 items-center"><BrandLogo name="netronix" className="w-32" /></Link>
          <Link href="/#ambassadors" className="inline-flex min-h-11 items-center gap-2 text-sm text-[#B3B3B3] transition-colors hover:text-white"><ArrowLeft size={16} aria-hidden="true" />Back to events</Link>
        </header>

        <div className="grid items-start gap-12 pt-10 sm:pt-14 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <AmbassadorIdentity />
            <h1 className="mt-9 font-heading text-[clamp(2.75rem,5.5vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
              Ambassador<br /><span className="text-[#FF3B4D]">call{open ? " is open." : " has closed."}</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#B3B3B3]">Be the connection between your campus and NETRONiX. Bring your university to Hack n&apos; Connect &amp; UGX for three days of ideas, competition and community.</p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-white/10 py-5 text-sm">
              <span className="inline-flex items-center gap-2.5"><CalendarDays size={19} className="text-[#60A5FA]" aria-hidden="true" /><span>{AMBASSADOR_CAMPAIGN.dates} <span className="text-[#999999]">{AMBASSADOR_CAMPAIGN.year}</span></span></span>
              <span className="inline-flex items-center gap-2.5"><MapPin size={19} className="text-[#60A5FA]" aria-hidden="true" />GIKI</span>
            </div>

            {open && <Link href="#apply" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#E11D2E] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C91829] lg:hidden">Apply as an ambassador</Link>}

            <section aria-labelledby="modules-heading" className="mt-9">
              <h2 id="modules-heading" className="font-heading text-xl font-semibold">Inside Hack n&apos; Connect</h2>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <div><dt className="font-medium text-[#60A5FA]">Connect Talks</dt><dd className="mt-2 text-sm leading-relaxed text-[#B3B3B3]">Engaging sessions led by visionary leaders.</dd></div>
                <div><dt className="font-medium text-[#60A5FA]">Venturethon</dt><dd className="mt-2 text-sm leading-relaxed text-[#B3B3B3]">Collaborate with your team to design innovative prototypes.</dd></div>
              </dl>
              <p className="mt-5 text-sm leading-relaxed text-[#B3B3B3]"><span className="font-medium text-[#FF6B79]">Plus UGX — Uber.Game X.</span> Bring your campus gaming community to GIKI.</p>
            </section>

            <section aria-labelledby="benefits-heading" className="mt-9">
              <h2 id="benefits-heading" className="font-heading text-xl font-semibold">Your ambassador benefits</h2>
              <ul className="mt-4 grid gap-3 text-sm text-[#D4D4D4] sm:grid-cols-2">
                {["Free event registration", "Free accommodation", "Official ambassadorship shield", "Free socials"].map((benefit) => <li key={benefit} className="flex items-start gap-2.5"><Check size={17} className="mt-0.5 shrink-0 text-[#60A5FA]" aria-hidden="true" />{benefit}</li>)}
              </ul>
            </section>
          </div>

          <div id="apply" className="scroll-mt-6">
            {open ? <AmbassadorForm /> : (
              <div className="rounded-2xl border border-white/10 bg-[#101010] p-8">
                <h2 className="font-heading text-2xl font-semibold">Applications are closed</h2>
                <p className="mt-4 text-sm leading-relaxed text-[#B3B3B3]">Thank you for your interest in representing your campus. Contact the event team below for questions about this call.</p>
              </div>
            )}
            <aside aria-label="Event team contacts" className="mt-6 px-1">
              <p className="text-sm text-[#B3B3B3]">Questions? Get in touch with the event team.</p>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div><p className="font-medium">Abdul Moiz</p><p className="mt-1 text-xs text-[#999999]">Event coordinator</p><a href="tel:+923259911113" className="mt-2 inline-flex min-h-11 items-center gap-2 text-[#93C5FD] hover:underline"><Phone size={14} aria-hidden="true" />0325-9911113</a></div>
                <div><p className="font-medium">Zain Ali</p><p className="mt-1 text-xs text-[#999999]">Liaison head</p><a href="tel:+923117794347" className="mt-2 inline-flex min-h-11 items-center gap-2 text-[#93C5FD] hover:underline"><Phone size={14} aria-hidden="true" />0311-7794347</a></div>
              </div>
            </aside>
          </div>
        </div>
        <footer className="mt-14 border-t border-white/10 pt-6 text-xs text-[#999999]">NETRONiX · Ghulam Ishaq Khan Institute</footer>
      </div>
    </main>
  );
}
