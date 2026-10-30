import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, LockKeyhole, MapPin } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { AMBASSADOR_CAMPAIGN } from "@/lib/ambassadors";
import { isHncOrUgx } from "@/lib/events";
import type { EventStatus } from "@prisma/client";
import styles from "./event-card.module.css";

interface EventCardProps {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  status: EventStatus;
  isPreReg?: boolean;
  registerHref?: string;
  imageSrc?: string;
}

export function EventCard({ slug, title, subtitle, description, status, isPreReg = false, registerHref, imageSrc }: EventCardProps) {
  const flagship = isHncOrUgx(slug);
  const shortName = slug === "ugx" ? "UGX" : "HNC";
  const statusLabel = isPreReg ? "Pre-registration open" : status === "live" ? (registerHref ? "Registration open" : "Registrations paused") : status === "past" ? "Concluded" : "Coming soon";
  const copy = flagship
    ? slug === "ugx"
      ? "Bring your gaming community to GIKI for three days of competition and connection."
      : "Connect Talks. Venturethon. Three days of fresh ideas, visionary leaders and innovative prototypes."
    : description;

  return (
    <article className={`${styles.card} ${flagship ? styles.flagship : styles.secondary}`} data-event={slug}>
      {!flagship && imageSrc && <div className={styles.image}><Image src={imageSrc} alt="" fill sizes="(max-width: 767px) 100vw, 33vw" className="object-cover" /></div>}
      <div className={styles.rail}>
        {flagship ? <BrandLogo name="netronix" className="w-24" /> : <span className="text-xs text-[#A1A1AA]">{subtitle}</span>}
        <span className={styles.status} data-open={Boolean(registerHref)}>{statusLabel}</span>
      </div>
      {flagship && <div className={styles.logoStage}><BrandLogo name={slug === "ugx" ? "ugx" : "hnc"} className={styles.eventLogo} /></div>}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{copy}</p>
      {flagship && <div className={styles.metadata}><span><CalendarDays size={14} aria-hidden="true" />{AMBASSADOR_CAMPAIGN.dates} {AMBASSADOR_CAMPAIGN.year}</span><span><MapPin size={14} aria-hidden="true" />GIKI</span></div>}
      {registerHref ? (
        <Link href={registerHref} className={styles.action} aria-label={`${isPreReg ? "Pre-register" : "Register"} for ${title}`}>
          {isPreReg ? "Pre-register" : "Register"}{flagship ? ` for ${shortName}` : ""}<span><ArrowUpRight size={17} aria-hidden="true" /></span>
        </Link>
      ) : <p className={styles.inactive}><LockKeyhole size={14} aria-hidden="true" />{status === "past" ? "This event has concluded" : status === "live" ? "New registrations are paused" : "Registration opens soon"}</p>}
    </article>
  );
}
