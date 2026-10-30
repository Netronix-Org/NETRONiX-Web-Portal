import Link from "next/link";
import { ArrowUpRight, Check, MapPin } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { AMBASSADOR_CAMPAIGN, isAmbassadorCallOpen } from "@/lib/ambassadors";
import styles from "./ambassador-call.module.css";

// Editorial scale and a single frosted stage, drawn from the user's references.
// The supplied official marks carry the blue/red identity; no poster crops.
export function AmbassadorCall() {
  const open = isAmbassadorCallOpen();

  return (
    <section id="ambassadors" aria-labelledby="ambassador-heading" className={styles.section}>
      <h2 id="ambassador-heading" className={styles.heading}>Ambassador call<span>.</span></h2>
      <div className={styles.stage}>
        <div className={styles.lighting} aria-hidden="true" />
        <div className={styles.surface}>
          <div className={styles.topline}>
            <BrandLogo name="netronix" className="w-28 sm:w-32" />
            <span className={styles.status}><span aria-hidden="true" />Applications {open ? "open" : "closed"}</span>
          </div>
          <div className={styles.identity}>
            <BrandLogo name="hnc" className={styles.hnc} />
            <span className={styles.logoDivider} aria-hidden="true" />
            <BrandLogo name="ugx" className={styles.ugx} />
          </div>
          <div className={styles.message}>
            <p className={styles.statement}>Two events. <span>One connection.</span></p>
            <p className={styles.description}>Represent your university. Bring your people.<br className="hidden sm:block" /> Be the connection between your campus and NETRONiX.</p>
          </div>
          <div className={styles.details}>
            <div className={styles.date}>
              <p>{AMBASSADOR_CAMPAIGN.dates}<span>{AMBASSADOR_CAMPAIGN.year}</span></p>
              <span><MapPin size={14} aria-hidden="true" />GIKI · Connect Talks · Venturethon · UGX gaming</span>
            </div>
            <Link href="/ambassadors" className={styles.cta}>
              {open ? "Become an ambassador" : "View ambassador call"}
              <span><ArrowUpRight size={18} strokeWidth={1.7} aria-hidden="true" /></span>
            </Link>
          </div>
          <ul className={styles.benefits} aria-label="Ambassador benefits">
            {["Free event registration", "Free accommodation", "Official ambassadorship shield", "Free socials"].map((benefit) => (
              <li key={benefit}><Check size={14} strokeWidth={1.6} aria-hidden="true" />{benefit}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
