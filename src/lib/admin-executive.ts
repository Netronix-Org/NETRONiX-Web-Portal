import type { AmbassadorApplication, Registration } from "@prisma/client";
import { getPaymentStatus, type PaymentStatus } from "./participants";
import { getAmbassadorCode, getHncChoices, getTransportPreference, getUgxGame } from "./validation/event-registration";

export const EXECUTIVE_EVENTS = {
  "hack-n-connect": "HNC",
  ugx: "UGX",
} as const;

export type ExecutiveEvent = keyof typeof EXECUTIVE_EVENTS;
type Choice = "Yes" | "No" | "Unspecified";
type HncType = "Participant" | "Observer" | "Unspecified";
type UgxGame = NonNullable<ReturnType<typeof getUgxGame>> | "Unspecified";

type Ambassador = Pick<AmbassadorApplication, "code" | "fullName" | "university" | "participantCount">;
type RegistrationInput = Pick<Registration,
  "id" | "fullName" | "city" | "university" | "ambassador" | "formData" |
  "paymentPaid" | "paymentDisposition" | "ambassadorVerifiedAt" | "paymentProofPath"
> & { event: { slug: string } };

export function isExecutiveEvent(slug: string): slug is ExecutiveEvent {
  return Object.hasOwn(EXECUTIVE_EVENTS, slug);
}

function summarize(rows: ExecutiveRegistration[]) {
  const payment: Record<PaymentStatus, number> = { pending: 0, paid: 0, refunded: 0, rejected: 0 };
  const transport: Record<Choice, number> = { Yes: 0, No: 0, Unspecified: 0 };
  const socials: Record<Choice, number> = { Yes: 0, No: 0, Unspecified: 0 };
  const hncTypes: Record<HncType, number> = { Participant: 0, Observer: 0, Unspecified: 0 };
  const ugxGames: Record<UgxGame, number> = { FC26: 0, "Tekken 8": 0, Unspecified: 0 };
  let proofs = 0;
  let awaitingNetronix = 0;

  for (const row of rows) {
    payment[row.payment]++;
    transport[row.transport]++;
    if (row.hasProof) proofs++;
    if (row.ambassadorVerified && row.payment === "pending") awaitingNetronix++;
    if (row.event === "hack-n-connect") {
      socials[row.socials]++;
      hncTypes[row.option]++;
    } else {
      ugxGames[row.option]++;
    }
  }

  return { total: rows.length, payment, transport, socials, hncTypes, ugxGames, proofs, awaitingNetronix };
}

interface RegistrationDetails {
  id: string;
  name: string;
  city: string | null;
  transport: Choice;
  payment: PaymentStatus;
  hasProof: boolean;
  ambassadorVerified: boolean;
  referralCode: string | null;
  referralName: string | null;
}

export type ExecutiveRegistration = RegistrationDetails & (
  | { event: "hack-n-connect"; option: HncType; socials: Choice }
  | { event: "ugx"; option: UgxGame }
);

export function summarizeExecutiveRegistrations(registrations: RegistrationInput[], ambassadors: Ambassador[]) {
  const rows: ExecutiveRegistration[] = [];
  const byEvent: Record<ExecutiveEvent, ExecutiveRegistration[]> = { "hack-n-connect": [], ugx: [] };
  const byCode = new Map(ambassadors.map((ambassador) => [String(ambassador.code), [] as ExecutiveRegistration[]]));
  const unassigned: ExecutiveRegistration[] = [];
  const transportGroups = new Map<string, {
    key: string;
    label: string;
    source: "university" | "city" | "unspecified";
    hnc: number;
    ugx: number;
    paid: number;
  }>();
  let unlinkedReferrals = 0;

  for (const registration of registrations) {
    const event = registration.event.slug;
    if (!isExecutiveEvent(event)) continue;

    const details: RegistrationDetails = {
      id: registration.id,
      name: registration.fullName,
      city: registration.city?.trim() || null,
      transport: getTransportPreference(registration.formData) ?? "Unspecified",
      payment: getPaymentStatus(registration),
      hasProof: Boolean(registration.paymentProofPath),
      ambassadorVerified: Boolean(registration.ambassadorVerifiedAt),
      referralCode: getAmbassadorCode(registration.formData),
      referralName: registration.ambassador?.trim() || null,
    };
    let row: ExecutiveRegistration;
    if (event === "hack-n-connect") {
      const choices = getHncChoices(registration.formData);
      row = { ...details, event, option: choices.registrationType ?? "Unspecified", socials: choices.socials ?? "Unspecified" };
    } else {
      row = { ...details, event, option: getUgxGame(registration.formData) ?? "Unspecified" };
    }
    rows.push(row);
    byEvent[event].push(row);

    const referred = row.referralCode ? byCode.get(row.referralCode) : undefined;
    if (referred) referred.push(row);
    else {
      unassigned.push(row);
      if (row.referralCode || row.referralName) unlinkedReferrals++;
    }

    if (row.transport === "Yes") {
      const university = registration.university?.trim();
      const source = university ? "university" : row.city ? "city" : "unspecified";
      const label = (university || row.city || "No university or city provided").replace(/\s+/g, " ");
      const key = `${source}:${label.toLowerCase()}`;
      const group = transportGroups.get(key) ?? { key, label, source, hnc: 0, ugx: 0, paid: 0 };
      if (event === "hack-n-connect") group.hnc++;
      else group.ugx++;
      if (row.payment === "paid") group.paid++;
      transportGroups.set(key, group);
    }
  }

  return {
    overall: summarize(rows),
    events: { "hack-n-connect": summarize(byEvent["hack-n-connect"]), ugx: summarize(byEvent.ugx) },
    ambassadors: ambassadors.map((ambassador) => ({
      ...ambassador,
      registrations: byCode.get(String(ambassador.code)) ?? [],
    })).sort((a, b) => b.registrations.length - a.registrations.length || a.fullName.localeCompare(b.fullName)),
    referred: rows.length - unassigned.length,
    unassigned,
    unlinkedReferrals,
    transportGroups: [...transportGroups.values()].sort((a, b) => (b.hnc + b.ugx) - (a.hnc + a.ugx) || a.label.localeCompare(b.label)),
  };
}

export type ExecutiveOverview = ReturnType<typeof summarizeExecutiveRegistrations>;
