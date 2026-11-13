import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { EventPortalLogin, EventPortalSignOut } from "@/components/forms/event-portal-auth";
import { PaymentProof } from "@/components/forms/payment-proof";
import { AmbassadorIdentity } from "@/components/ui/ambassador-identity";
import { BrandLogo } from "@/components/ui/brand-logo";
import { PortalEventStrip } from "@/components/ui/portal-event-strip";
import { CopyValueButton } from "@/components/ui/copy-value-button";
import { getAmbassadorSession } from "@/lib/ambassador-session";
import { prisma } from "@/lib/prisma";
import { getPaymentStatus } from "@/lib/participants";
import { getHncChoices, getTransportPreference, getUgxGame } from "@/lib/validation/event-registration";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ambassador Portal",
  robots: { index: false, follow: false },
};

const submittedAt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Karachi",
});

export default async function AmbassadorPortalPage() {
  const ambassador = await getAmbassadorSession();
  const referrals = ambassador ? await prisma.registration.findMany({
    where: {
      event: { slug: { in: ["hack-n-connect", "ugx"] } },
      formData: { path: ["ambassadorCode"], equals: String(ambassador.code) },
    },
    select: {
      id: true, fullName: true, email: true, phone: true, cnic: true, city: true,
      university: true, ambassador: true, isPreRegistration: true, createdAt: true, formData: true,
      paymentPaid: true, paymentDisposition: true, ambassadorVerifiedAt: true, paymentProofPath: true,
      event: { select: { slug: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  }) : [];

  return (
    <main id="main-content" className="min-h-screen bg-[#050505] px-4 pb-16 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 py-5">
          <Link href="/" aria-label="NETRONiX home" className="inline-flex min-h-11 items-center">
            <BrandLogo name="netronix" className="w-32" />
          </Link>
          {ambassador ? <EventPortalSignOut portal="ambassadors" /> : (
            <Link href="/ambassadors#apply" className="inline-flex min-h-11 items-center gap-2 text-sm text-[#C4D1E5] hover:text-white">
              <ArrowLeft size={16} aria-hidden="true" /> Ambassador application
            </Link>
          )}
        </header>

        {ambassador ? (
          <>
            <div className="flex flex-col items-start justify-between gap-7 border-b border-white/15 py-9 sm:flex-row sm:items-end">
              <div>
                <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">Your referrals</h1>
                <p className="mt-3 text-[#B3B3B3]">{ambassador.fullName} · {referrals.length} {referrals.length === 1 ? "registration" : "registrations"}</p>
                <p className="mt-2 text-sm text-[#B3B3B3]">Bring your campus to GIKI. Share your code and see who signs up.</p>
              </div>
              <div className="border-l border-[#6CA8FF]/70 pl-4">
                <p className="text-sm text-[#C4D1E5]">Ambassador code</p>
                <p className="my-1 font-mono text-3xl tracking-wider">{ambassador.code}</p>
                <CopyValueButton value={String(ambassador.code)} label="code" />
              </div>
            </div>
            <div className="mt-6"><PortalEventStrip /></div>
            {referrals.length === 0 ? (
              <p className="mt-8 max-w-xl leading-relaxed text-[#B3B3B3]">No participants have used your code yet. Share it with your participants so they can enter it on the HNC or UGX registration form.</p>
            ) : (
              <div className="mt-6 divide-y divide-white/15 border-y border-white/15">
                {referrals.map((registration) => {
                  const ugx = registration.event.slug === "ugx";
                  const { registrationType, socials } = getHncChoices(registration.formData);
                  const fields = [
                    ["Event", registration.event.title],
                    ["Email", registration.email],
                    ["Phone", registration.phone],
                    ["CNIC", registration.cnic ? `Ending in ${registration.cnic.slice(-4)}` : null],
                    ["City", registration.city],
                    ["University", registration.university],
                    ["Ambassador name", registration.ambassador],
                    ["Transport", getTransportPreference(registration.formData)],
                    ...(ugx ? [["Game", getUgxGame(registration.formData)]] : [
                      ["Registration type", registrationType],
                      ["Socials opt-in", socials],
                    ]),
                    ["Registration", registration.isPreRegistration ? "Pre-registration" : "Regular"],
                    ["Submitted", submittedAt.format(registration.createdAt)],
                    ["Reference", registration.id],
                  ];
                  return (
                    <details key={registration.id} className="group">
                      <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto_1.25rem] items-center gap-3 rounded-lg px-2 py-4 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#93C5FD] [&::-webkit-details-marker]:hidden">
                        <span className="min-w-0 break-words font-medium">{registration.fullName}</span>
                        <span className={`text-sm font-medium ${ugx ? "text-[#FF8B96]" : "text-[#93C5FD]"}`}>{ugx ? "UGX" : "HNC"}</span>
                        <ChevronDown size={18} className="text-[#B3B3B3] group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <dl className="grid grid-cols-1 gap-5 px-2 pb-6 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                        {fields.map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-xs text-[#B3B3B3]">{label}</dt>
                            <dd className="mt-1 break-words text-sm">{value || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="px-2 pb-5">
                        <PaymentProof id={registration.id} status={getPaymentStatus(registration)} proofPath={registration.paymentProofPath} ambassadorVerified={Boolean(registration.ambassadorVerifiedAt)} mode="ambassador" />
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="grid items-center gap-9 py-10 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
            <div>
              <AmbassadorIdentity />
              <h1 className="mt-7 font-heading text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-none tracking-tight">Ambassador portal</h1>
              <p className="mt-5 max-w-md leading-relaxed text-[#B3B3B3]">Track the HNC and UGX participants who registered with your code. Sign in using your application email and issued password.</p>
            </div>
            <EventPortalLogin portal="ambassadors" />
          </div>
        )}
      </div>
    </main>
  );
}
