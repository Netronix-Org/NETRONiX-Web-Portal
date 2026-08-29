import { SectionWrapper, SectionItem } from "@/components/ui/section-wrapper";
import { EventCard } from "@/components/ui/event-card";
import { fetchEvents } from "@/lib/events-data";
import type { EventRow } from "@/lib/events-data";
import {
  effectiveStatus,
  isRegistrationOpen,
  isPreRegistration,
  getRegisterButtonLabel,
  registrationHref,
} from "@/lib/events";

/**
 * Events are now driven by the `events` table in Supabase. Flip an event to
 * "Live Now" or "Coming Soon with Registrations Open" in /admin/portal and its card
 * here turns into a working Register / Pre-Register button pointing at that event's form.
 *
 * Server Component — the fetch happens on the server on every request, so a
 * status change in the portal shows up on the next page load. The homepage
 * opts out of static rendering for this reason (see src/app/page.tsx).
 */

export async function Events() {
  const events = await fetchEvents();

  if (events.length === 0) return null;

  const [featured, ...rest] = events;

  return (
    <section
      id="events"
      aria-labelledby="events-heading"
      className="section-padding px-4 md:px-8 max-w-7xl mx-auto w-full"
    >
      <SectionWrapper className="flex flex-col gap-12" delay={0.05}>

        {/* ── Heading ────────────────────────────────────────────────────── */}
        <SectionItem className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p
              className="font-mono text-xs uppercase tracking-widest mb-4"
              style={{ color: "#E11D2E", letterSpacing: "0.12em" }}
            >
              Signature Events
            </p>
            <h2
              id="events-heading"
              className="font-heading font-semibold"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.75rem)",
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
              }}
            >
              Events
            </h2>
          </div>

          <p
            className="text-sm max-w-xs text-right hidden md:block"
            style={{ color: "#666666" }}
          >
            From annual gaming tournaments to hackathons — NETRONiX builds
            GIKI&apos;s most memorable experiences.
          </p>
        </SectionItem>

        {/* ── Cards grid ────────────────────────────────────────────────── */}
        <SectionItem>
          {/*
            Asymmetric layout:
            - Desktop: featured event spans 2 rows on the left; 2×2 grid on right
            - Mobile: single column stack
          */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Large featured card — spans 2 rows on lg */}
            <div className="md:col-span-1 lg:row-span-2">
              <EventCard
                key={featured.id}
                title={featured.title}
                subtitle={featured.subtitle || ""}
                description={featured.description}
                status={effectiveStatus(featured)}
                isPreReg={isPreRegistration(featured)}
                buttonLabel={getRegisterButtonLabel(featured)}
                accentColor={featured.accentColor}
                imagePlaceholder={featured.imagePlaceholder || ""}
                imageSrc={featured.imageSrc || ""}
                registerHref={
                  isRegistrationOpen(featured)
                    ? registrationHref(featured.slug)
                    : undefined
                }
                aspectClass="aspect-[4/3] lg:aspect-auto lg:min-h-[480px]"
              />
            </div>

            {/* Remaining cards in 2×2 */}
            {rest.map((event: EventRow) => (
              <EventCard
                key={event.id}
                title={event.title}
                subtitle={event.subtitle || ""}
                description={event.description}
                status={effectiveStatus(event)}
                isPreReg={isPreRegistration(event)}
                buttonLabel={getRegisterButtonLabel(event)}
                accentColor={event.accentColor}
                imagePlaceholder={event.imagePlaceholder || ""}
                imageSrc={event.imageSrc || ""}
                registerHref={
                  isRegistrationOpen(event)
                    ? registrationHref(event.slug)
                    : undefined
                }
              />
            ))}
          </div>
        </SectionItem>

      </SectionWrapper>
    </section>
  );
}
