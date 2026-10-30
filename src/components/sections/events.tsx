import { EventCard } from "@/components/ui/event-card";
import { fetchEvents, type EventRow } from "@/lib/events-data";
import { effectiveStatus, isRegistrationOpen, isPreRegistration, registrationHref, isHncOrUgx } from "@/lib/events";
import styles from "./events.module.css";

export async function Events() {
  const events = await fetchEvents();
  if (events.length === 0) return null;
  const signature = events.filter((event) => isHncOrUgx(event.slug));
  const other = events.filter((event) => !isHncOrUgx(event.slug));
  const now = new Date();

  function card(event: EventRow) {
    return <EventCard key={event.id} slug={event.slug} title={event.title} subtitle={event.subtitle || ""} description={event.description} status={effectiveStatus(event, now)} isPreReg={isPreRegistration(event, now)} imageSrc={event.imageSrc || ""} registerHref={isRegistrationOpen(event, now) ? registrationHref(event.slug) : undefined} />;
  }

  return (
    <section id="events" aria-labelledby="events-heading" className={styles.section}>
      <div className={styles.header}>
        <h2 id="events-heading" className={styles.heading}>Events<span>.</span></h2>
        <p className={styles.intro}>From gaming tournaments to new ideas. Find your place in the NETRONiX community.</p>
      </div>
      {signature.length > 0 && <div className={styles.flagships}>{signature.map(card)}</div>}
      {other.length > 0 && <><p className={styles.more}>More from NETRONiX</p><div className={styles.secondary}>{other.map(card)}</div></>}
    </section>
  );
}
