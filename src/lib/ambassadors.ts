/** One application covers both events; this is separate from participant registration. */
export const AMBASSADOR_CAMPAIGN = {
  id: "hnc-ugx-december-2026",
  dates: "11–13 December",
  year: 2026,
  closesAt: "2026-12-14T00:00:00+05:00",
} as const;

export function isAmbassadorCallOpen(now = new Date()): boolean {
  return now.getTime() < new Date(AMBASSADOR_CAMPAIGN.closesAt).getTime();
}

export interface AmbassadorApplicationRow {
  id: string;
  fullName: string;
  cnic: string;
  phone: string;
  email: string | null;
  university: string;
  participantCount: number;
  createdAt: string;
}
