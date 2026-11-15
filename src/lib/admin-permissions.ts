import type { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Executive Admin",
  MANAGER: "Junior Coordinator",
  LIAISON: "Liaison Team",
};

export const CONFIGURABLE_ROLES = ["MANAGER", "LIAISON"] as const;
export const ADMIN_PERMISSIONS = {
  hnc: "HNC registrations",
  ugx: "UGX registrations",
  otherRegistrations: "Other event submissions",
  ambassadors: "Ambassador registrations",
  events: "Event settings",
  complaints: "Complaints Desk",
  paymentScreenshots: "Payment screenshots",
} as const;

export const PERMISSION_KEYS = Object.keys(ADMIN_PERMISSIONS) as AdminPermission[];
export type AdminPermission = keyof typeof ADMIN_PERMISSIONS;
export type AdminPermissions = Record<AdminPermission, boolean>;

export const DEFAULT_PERMISSIONS: Record<Role, AdminPermissions> = {
  ADMIN: { hnc: true, ugx: true, otherRegistrations: true, ambassadors: true, events: true, complaints: true, paymentScreenshots: true },
  MANAGER: { hnc: false, ugx: false, otherRegistrations: true, ambassadors: false, events: true, complaints: true, paymentScreenshots: false },
  LIAISON: { hnc: true, ugx: true, otherRegistrations: false, ambassadors: false, events: false, complaints: false, paymentScreenshots: false },
};

export function registrationPermission(slug: string): AdminPermission {
  if (slug === "hack-n-connect") return "hnc";
  if (slug === "ugx") return "ugx";
  return "otherRegistrations";
}
