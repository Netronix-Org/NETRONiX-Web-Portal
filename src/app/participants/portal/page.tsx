import type { Metadata } from "next";
import Link from "next/link";
import { EventPortalLogin, EventPortalSignOut } from "@/components/forms/event-portal-auth";
import { PaymentProof } from "@/components/forms/payment-proof";
import { AmbassadorIdentity } from "@/components/ui/ambassador-identity";
import { BrandLogo } from "@/components/ui/brand-logo";
import { PortalEventStrip } from "@/components/ui/portal-event-strip";
import { AMBASSADOR_CAMPAIGN } from "@/lib/ambassadors";
import { getParticipantEmail } from "@/lib/participant-session";
import { PARTICIPANT_EVENT_SLUGS } from "@/lib/participants";
import { prisma } from "@/lib/prisma";
import { getAmbassadorCode, getHncChoices, getTransportPreference, getUgxGame } from "@/lib/validation/event-registration";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Participant Portal",
  robots: { index: false, follow: false },
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Karachi",
});

export default async function ParticipantPortalPage() {
  const email = await getParticipantEmail();
  const registrations = email ? await prisma.registration.findMany({
    where: { email: { equals: email, mode: "insensitive" }, event: { slug: { in: PARTICIPANT_EVENT_SLUGS } } },
    select: {
      id: true, fullName: true, email: true, phone: true, cnic: true, city: true, university: true,
      ambassador: true, formData: true, status: true, isPreRegistration: true, createdAt: true,
      paymentPaid: true, paymentProofPath: true, event: { select: { slug: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  }) : [];
  const codes = registrations.map(({ formData }) => getAmbassadorCode(formData)).filter(Boolean).map(Number);
  const ambassadors = codes.length ? await prisma.ambassadorApplication.findMany({
    where: { code: { in: codes }, campaign: AMBASSADOR_CAMPAIGN.id },
    select: { code: true, fullName: true },
  }) : [];
  const names = new Map(ambassadors.map(({ code, fullName }) => [String(code), fullName]));

  return (
    <main id="main-content" className="min-h-screen bg-[#050505] px-4 pb-16 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 py-5">
          <Link href="/" aria-label="NETRONiX home" className="inline-flex min-h-11 items-center">
            <BrandLogo name="netronix" className="w-32" />
          </Link>
          {email ? <EventPortalSignOut portal="participants" /> : (
            <Link href="/#events" className="inline-flex min-h-11 items-center text-sm text-[#C4D1E5] hover:text-white">Back to events</Link>
          )}
        </header>

        {email ? (
          <>
            <div className="border-b border-white/15 py-9">
              <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">Your registrations</h1>
              <p className="mt-3 break-words text-[#B3B3B3]">{email}</p>
              <p className="mt-2 text-sm text-[#B3B3B3]">Your registrations and payment updates are all here.</p>
            </div>
            <div className="mt-6"><PortalEventStrip /></div>
            {registrations.length === 0 && <p className="mt-8 text-[#B3B3B3]">No HNC or UGX registrations are linked to this email.</p>}
            <div className="mt-6 grid gap-5">
              {registrations.map((registration) => {
                const ugx = registration.event.slug === "ugx";
                const code = getAmbassadorCode(registration.formData);
                const { registrationType, socials } = getHncChoices(registration.formData);
                const details = [
                  ["Name", registration.fullName],
                  ["Email", registration.email],
                  ["Phone", registration.phone],
                  ["CNIC", registration.cnic],
                  ["City", registration.city],
                  ["University", registration.university],
                  ["Ambassador", names.get(code ?? "") ?? registration.ambassador],
                  ["Ambassador code", code],
                  ["Transport", getTransportPreference(registration.formData)],
                  ...(ugx ? [["Game", getUgxGame(registration.formData)]] : [
                    ["Registration type", registrationType],
                    ["Socials opt-in", socials],
                  ]),
                  ["Registration", registration.isPreRegistration ? "Pre-registration" : "Regular"],
                  ["Registration status", registration.status[0].toUpperCase() + registration.status.slice(1)],
                  ["Submitted", dateFormat.format(registration.createdAt)],
                  ["Reference", registration.id],
                ];
                return (
                  <article key={registration.id} className="min-w-0 rounded-2xl border border-white/15 bg-[#141416] p-5 sm:p-7">
                    <h2 className={`font-heading text-2xl font-semibold ${ugx ? "text-[#FF8B96]" : "text-[#93C5FD]"}`}>{registration.event.title}</h2>
                    <details className="my-4">
                      <summary className="cursor-pointer py-2 text-sm text-[#C4D1E5]">Registration details</summary>
                      <dl className="mt-3 grid grid-cols-1 gap-4 pb-3 sm:grid-cols-2 lg:grid-cols-3">
                        {details.map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-xs text-[#B3B3B3]">{label}</dt>
                            <dd className="mt-1 break-words text-sm">{value || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                    <PaymentProof id={registration.id} paid={registration.paymentPaid} proofPath={registration.paymentProofPath} />
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid items-center gap-9 py-10 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
            <div>
              <AmbassadorIdentity />
              <h1 className="mt-7 font-heading text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-none tracking-tight">Participant portal</h1>
              <p className="mt-5 max-w-md leading-relaxed text-[#B3B3B3]">Sign in with your registration email and the password we emailed you. See your HNC and UGX registrations, upload payment screenshots, and check your payment status.</p>
            </div>
            <EventPortalLogin portal="participants" />
          </div>
        )}
      </div>
    </main>
  );
}
