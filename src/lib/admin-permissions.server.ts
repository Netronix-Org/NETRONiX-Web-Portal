import "server-only";
import type { Prisma, Role } from "@prisma/client";
import { DEFAULT_PERMISSIONS, PERMISSION_KEYS, type AdminPermission, type AdminPermissions } from "./admin-permissions";
import { PARTICIPANT_EVENT_SLUGS } from "./participants";
import { prisma } from "./prisma";

export async function getAdminPermissions(role: Role): Promise<AdminPermissions> {
  const permissions = { ...DEFAULT_PERMISSIONS[role] };
  if (role === "ADMIN") return permissions;
  const overrides = await prisma.adminRolePermission.findMany({ where: { role } });
  for (const override of overrides) {
    const permission = override.permission as AdminPermission;
    if (PERMISSION_KEYS.includes(permission)) permissions[permission] = override.enabled;
  }
  return permissions;
}

export async function hasAdminPermission(role: Role, permission: AdminPermission) {
  return (await getAdminPermissions(role))[permission];
}

export function accessibleRegistrationEvents(permissions: AdminPermissions): Prisma.EventWhereInput {
  return {
    OR: [
      ...(permissions.hnc ? [{ slug: "hack-n-connect" }] : []),
      ...(permissions.ugx ? [{ slug: "ugx" }] : []),
      ...(permissions.otherRegistrations ? [{ slug: { notIn: PARTICIPANT_EVENT_SLUGS } }] : []),
    ],
  };
}
