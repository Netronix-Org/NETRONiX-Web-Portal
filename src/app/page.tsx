import { Nav } from "@/components/ui/nav";
import { Hero } from "@/components/sections/hero";
import { CinematicBridge } from "@/components/sections/cinematic-bridge";
import { About } from "@/components/sections/about";
import { Events } from "@/components/sections/events";
import { AmbassadorCall } from "@/components/sections/ambassador-call";
import { ComplaintPortal } from "@/components/sections/complaint-portal";
import { Community } from "@/components/sections/community";
import { Join } from "@/components/sections/join";
import { Footer } from "@/components/sections/footer";
import { ScrollRevealSection } from "@/components/ui/scroll-reveal-section";
import { NeuralNoise } from "@/components/ui/neural-noise";
import { isAmbassadorCallOpen } from "@/lib/ambassadors";

// Events are read from Supabase per request, so an admin flipping an event to
// Live Now shows up on the next page load rather than at the next deploy.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <Nav />

      {/* ── Main narrative flow ─────────────────────────────────────────── */}
      <main id="main-content">
        {/* 1. Network Awakens — no reveal wrapper (it's the entry point) */}
        <Hero ambassadorCallOpen={isAmbassadorCallOpen()} />

        {/* 2. Cinematic Bridge — Signal travels → NETRONiX logo reveals */}
        <CinematicBridge />

        {/* 3. About — subtle reveal, threshold higher so it fires earlier */}
        <ScrollRevealSection amount={0.05} distance={50}>
          <About />
        </ScrollRevealSection>

        <AmbassadorCall />

        {/* 4. Events */}
        <ScrollRevealSection amount={0.06} distance={60}>
          <Events />
        </ScrollRevealSection>

        {/* 5. Complaint Portal */}
        <ScrollRevealSection amount={0.06} distance={60}>
          <ComplaintPortal />
        </ScrollRevealSection>

        {/* 6 & 7. Community & Join (Shared Neural Background) */}
        <div className="relative w-full overflow-hidden border-t border-white/5 pb-20">
          <NeuralNoise color={[0.88, 0.11, 0.18]} opacity={0.15} />
          
          <div className="relative z-10 w-full">
            {/* 6. Community */}
            <ScrollRevealSection amount={0.06} distance={60}>
              <Community />
            </ScrollRevealSection>

            {/* 7. Join */}
            <ScrollRevealSection amount={0.08} distance={50}>
              <Join />
            </ScrollRevealSection>
          </div>
        </div>
      </main>

      {/* ── Footer — Network Core ────────────────────────────────────────── */}
      <ScrollRevealSection amount={0.04} distance={40}>
        <Footer />
      </ScrollRevealSection>
    </>
  );
}
