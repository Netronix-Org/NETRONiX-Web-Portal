import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CONFIGURABLE_ROLES, PERMISSION_KEYS } from "@/lib/admin-permissions";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ChangePermission = z.object({
  role: z.enum(CONFIGURABLE_ROLES),
  permission: z.enum(PERMISSION_KEYS),
  enabled: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    if (admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Executive admin access required." }, { status: 403 });
    }

    const parsed = ChangePermission.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Invalid permission change." }, { status: 400 });

    const { role, permission, enabled } = parsed.data;
    await prisma.adminRolePermission.upsert({
      where: { role_permission: { role, permission } },
      create: { role, permission, enabled },
      update: { enabled },
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ message: "Couldn’t save this permission." }, { status: 503 });
  }
}
