import type { Prisma } from "@prisma/client";
import { AMBASSADOR_CAMPAIGN } from "./ambassadors";
import { isHncOrUgx } from "./events";
import { prisma } from "./prisma";
import { getAmbassadorCode, UGX_GAMES } from "./validation/event-registration";

export const ROSTER_PAGE_SIZE = 50;

export function rosterPage(params: URLSearchParams) {
  const page = Number(params.get("page"));
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100_000) : 0;
}

function textFilter(params: URLSearchParams, key: string) {
  return params.get(key)?.trim().slice(0, 200) || "";
}

function contains(value: string) {
  return { contains: value.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" as const };
}

function contactSearch(query: string) {
  const compact = query.replace(/[\s()+-]/g, "");
  return [
    { fullName: contains(query) },
    { email: contains(query) },
    { phone: contains(query) },
    ...(/^\d+$/.test(compact) ? [{ phone: contains(compact) }, { cnic: contains(compact) }] : []),
  ];
}

async function ambassadorMatches(query: string): Promise<Prisma.RegistrationWhereInput[]> {
  const matches = await prisma.ambassadorApplication.findMany({
    where: { campaign: AMBASSADOR_CAMPAIGN.id, fullName: contains(query) },
    select: { code: true },
  });
  const codes = new Set(matches.map(({ code }) => String(code)));
  if (/^\d{4}$/.test(query)) codes.add(query);
  return [
    { ambassador: contains(query) },
    ...Array.from(codes, (code) => ({ formData: { path: ["ambassadorCode"], equals: code } })),
  ];
}

export async function registrationRosterQuery(eventId: string, slug: string, params: URLSearchParams) {
  const where: Prisma.RegistrationWhereInput = { eventId };
  const orderBy: Prisma.RegistrationOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];
  const query = textFilter(params, "q");

  if (!isHncOrUgx(slug)) {
    if (query) {
      where.OR = [
        { fullName: contains(query) },
        { registrationNumber: contains(query) },
        { email: contains(query) },
        { cnic: contains(query.replace(/-/g, "") || query) },
      ];
    }
    return { where, orderBy };
  }

  const university = textFilter(params, "university");
  const city = textFilter(params, "city");
  const ambassador = textFilter(params, "ambassador");
  const payment = params.get("payment");
  const proof = params.get("proof");
  const transport = params.get("transport");
  const choice = textFilter(params, "choice");
  const socials = params.get("socials");
  const sort = params.get("sort");
  const conditions: Prisma.RegistrationWhereInput[] = [];

  const [searchReferrals, filterReferrals] = await Promise.all([
    query ? ambassadorMatches(query) : [],
    ambassador ? ambassadorMatches(ambassador) : [],
  ]);
  if (query) conditions.push({ OR: [
    ...contactSearch(query), { university: contains(query) }, { city: contains(query) }, ...searchReferrals,
  ] });
  if (ambassador) conditions.push({ OR: filterReferrals });
  if (university) where.university = contains(university);
  if (city) where.city = contains(city);
  if (payment === "paid" || payment === "pending") where.paymentPaid = payment === "paid";
  if (proof === "uploaded") where.paymentProofPath = { not: null };
  if (proof === "missing") where.paymentProofPath = null;
  if (transport === "yes" || transport === "no") conditions.push({ formData: { path: ["transport"], equals: transport } });
  if (slug === "ugx" && UGX_GAMES.some((game) => game === choice)) {
    conditions.push({ formData: { path: ["game"], equals: choice } });
  }
  if (slug === "hack-n-connect") {
    if (choice === "Participant" || choice === "Observer") conditions.push({ formData: { path: ["registrationType"], equals: choice } });
    if (socials === "Yes" || socials === "No") conditions.push({ formData: { path: ["socials"], equals: socials } });
  }
  where.AND = conditions;

  if (sort === "oldest") orderBy[0] = { createdAt: "asc" };
  if (sort === "name") orderBy.unshift({ fullName: "asc" });
  if (sort === "university") orderBy.unshift({ university: { sort: "asc", nulls: "last" } });
  if (sort === "payment") orderBy.unshift({ paymentPaid: "asc" });
  return { where, orderBy };
}

export async function registrationAmbassadorNames(registrations: { formData: unknown }[]) {
  const codes = new Set(registrations.map((row) => getAmbassadorCode(row.formData)).filter(Boolean).map(Number));
  if (!codes.size) return {};
  const ambassadors = await prisma.ambassadorApplication.findMany({
    where: { code: { in: [...codes] }, campaign: AMBASSADOR_CAMPAIGN.id },
    select: { code: true, fullName: true },
  });
  return Object.fromEntries(ambassadors.map(({ code, fullName }) => [code, fullName]));
}

export function ambassadorRosterQuery(params: URLSearchParams) {
  const where: Prisma.AmbassadorApplicationWhereInput = { campaign: AMBASSADOR_CAMPAIGN.id };
  const orderBy: Prisma.AmbassadorApplicationOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];
  const query = textFilter(params, "q");
  const university = textFilter(params, "university");
  const access = params.get("access");
  const sort = params.get("sort");

  if (query) where.OR = [
    ...contactSearch(query), { university: contains(query) },
    ...(/^\d{4}$/.test(query) ? [{ code: Number(query) }] : []),
  ];
  if (university) where.university = contains(university);
  if (access === "ready") {
    where.email = { not: null };
    where.issuedPassword = { not: null };
  }
  if (access === "missing-email") where.email = null;
  if (access === "missing-password") where.issuedPassword = null;

  if (sort === "oldest") orderBy[0] = { createdAt: "asc" };
  if (sort === "name") orderBy.unshift({ fullName: "asc" });
  if (sort === "university") orderBy.unshift({ university: "asc" });
  if (sort === "participants") orderBy.unshift({ participantCount: "desc" });
  return { where, orderBy };
}
