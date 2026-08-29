import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { skillLabel } from "@/lib/events";
import type { Registration } from "@prisma/client";

/**
 * GET /api/admin/registrations/export?eventId=...
 *
 * Downloads one event's submissions as CSV — the handoff format for
 * attendance sheets and mailing lists.
 */

const COLUMNS = [
  "Submitted At",
  "Type",
  "Name",
  "Registration Number",
  "Batch",
  "Email",
  "Phone",
  "Hostel",
  "Skills",
  "Other Skill",
  "About NETRONiX",
  "Status",
  "Admin Notes",
] as const;

/** RFC 4180 escaping, plus a guard against spreadsheet formula injection. */
function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsvRow(reg: Registration): string {
  return [
    reg.createdAt.toISOString(),
    reg.isPreRegistration ? "Pre-Registration" : "Regular",
    reg.fullName,
    reg.registrationNumber,
    reg.batch,
    reg.email,
    reg.phone,
    reg.hostel,
    reg.skills.map(skillLabel).join("; "),
    reg.otherSkill,
    reg.aboutNetronix,
    reg.status,
    reg.adminNotes,
  ]
    .map(csvCell)
    .join(",");
}

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ message: "eventId is required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { slug: true },
  });

  if (!event) {
    return NextResponse.json({ message: "Event not found" }, { status: 404 });
  }

  const registrations = await prisma.registration.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });

  const csv = [COLUMNS.map(csvCell).join(","), ...registrations.map(toCsvRow)].join("\r\n");

  // BOM so Excel opens UTF-8 names correctly.
  const filename = `netronix-${event.slug}-registrations.csv`;

  return new NextResponse("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
