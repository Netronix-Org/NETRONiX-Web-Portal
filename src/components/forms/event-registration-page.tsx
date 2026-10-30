import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import type { Event } from "@prisma/client";
import { BrandLogo } from "@/components/ui/brand-logo";
import { AMBASSADOR_CAMPAIGN } from "@/lib/ambassadors";
import { effectiveStatus, isRegistrationOpen, isPreRegistration } from "@/lib/events";
import { EventRegistrationForm } from "./event-registration-form";
import styles from "./event-registration.module.css";

/** HNC/UGX inherit the graphite glass and editorial scale of the event cards. */
export function EventRegistrationPage({ event }: { event: Event }) {
  const hnc = event.slug === "hack-n-connect";
  const now = new Date();
  const status = effectiveStatus(event, now);
  const open = isRegistrationOpen(event, now);
  const isPreReg = isPreRegistration(event, now);

  return (
    <main id="main-content" className={styles.page} data-event={event.slug}>
      <div className={styles.container}>
        <header className={styles.masthead}>
          <Link href="/" className={styles.home} aria-label="NETRONiX — home"><BrandLogo name="netronix" className="w-32" /></Link>
          <Link href="/#events" className={styles.back}><ArrowLeft size={15} aria-hidden="true" />Back to events</Link>
        </header>
        <div className={styles.layout}>
          <div className={styles.context}>
            <BrandLogo name={hnc ? "hnc" : "ugx"} className={styles.eventLogo} />
            <h1 className={styles.title}>{isPreReg ? "Pre-register" : "Register for"}<span>{hnc ? "HNC" : "UGX"}.</span></h1>
            <p className={styles.intro}>{hnc ? "Hack n’ Connect brings ideas and people together. Join Connect Talks and collaborate with your team at Venturethon." : "Uber.Game X brings your gaming community to GIKI. Join three days of competition and connection."}</p>
            <div className={styles.eventMeta}><span><CalendarDays size={16} aria-hidden="true" />{AMBASSADOR_CAMPAIGN.dates} {AMBASSADOR_CAMPAIGN.year}</span><span><MapPin size={16} aria-hidden="true" />GIKI</span></div>
            {hnc ? <dl className={styles.modules}>
              <div><dt>Connect Talks</dt><dd>Engaging sessions led by visionary leaders.</dd></div>
              <div><dt>Venturethon</dt><dd>Collaborate to design innovative prototypes.</dd></div>
            </dl> : <p className={styles.note}>Bring your people. Find your competition.<br />Make your next move with NETRONiX.</p>}
          </div>
          {open ? <EventRegistrationForm slug={event.slug} eventTitle={event.title} isPreReg={isPreReg} /> : (
            <div className={styles.panel}>
              <h2 className={styles.successTitle}>{status === "past" ? "This event has concluded." : status === "live" ? "Registrations paused." : "Registration opens soon."}</h2>
              <p className={styles.closed}>{status === "past" ? "Thank you for your interest. Explore the events page for what comes next." : "New registrations are currently unavailable. Check back here for updates from the event team."}</p>
              <Link href="/#events" className={`${styles.back} mt-6`}><ArrowLeft size={15} aria-hidden="true" />Explore events</Link>
            </div>
          )}
        </div>
        <footer className={styles.footer}><span>NETRONiX · Ghulam Ishaq Khan Institute</span><span>HNC &amp; UGX · December {AMBASSADOR_CAMPAIGN.year}</span></footer>
      </div>
    </main>
  );
}
