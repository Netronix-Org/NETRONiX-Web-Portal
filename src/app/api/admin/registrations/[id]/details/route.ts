import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { participantSelect } from "@/lib/admin-participant";
import { AMBASSADOR_CAMPAIGN } from "@/lib/ambassadors";
import { PARTICIPANT_EVENT_SLUGS } from "@/lib/participants";
import { EventRegistrationSchema } from "@/lib/validation/event-registration";
import { getOrIssueParticipantPassword } from "@/lib/participant-credentials";
import { revealAmbassadorPassword, sealAmbassadorPassword } from "@/lib/ambassador-credentials";

const EditSchema = z.object({
  updatedAt: z.iso.datetime(),
  changes: EventRegistrationSchema.partial().strict().refine(
    (changes) => Object.keys(changes).length > 0, "Change at least one field.",
  ),
}).strict();

class EditConflict extends Error {}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    if (admin.role !== "ADMIN") return NextResponse.json({ message: "System admin access required." }, { status: 403 });
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) return NextResponse.json({ message: "Invalid registration ID." }, { status: 400 });
    const body = await req.json().catch(() => null);
    const parsed = EditSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({
      message: parsed.error.issues[0]?.message ?? "Check the fields and try again.",
      errors: parsed.error.flatten().fieldErrors,
    }, { status: 400 });

    const registration = await prisma.$transaction(async (tx) => {
      const row = await tx.registration.findUnique({
        where: { id, event: { slug: { in: PARTICIPANT_EVENT_SLUGS } } },
        include: { event: { select: { slug: true } } },
      });
      if (!row) throw new EditConflict("Registration no longer exists. Refresh the list.");
      if (row.updatedAt.toISOString() !== parsed.data.updatedAt) {
        throw new EditConflict("This registration changed while you were editing. Refresh the list and try again.");
      }
      const { game, transport, registrationType, socials, ambassadorCode, ...contact } = parsed.data.changes;
      if ((row.event.slug === "ugx" && (registrationType !== undefined || socials !== undefined)) ||
          (row.event.slug === "hack-n-connect" && game !== undefined)) {
        throw new EditConflict("These choices do not apply to this event.");
      }
      const formData = (row.formData && typeof row.formData === "object" && !Array.isArray(row.formData))
        ? { ...row.formData } : {};
      for (const [key, value] of Object.entries({ game, transport, registrationType, socials })) {
        if (value !== undefined) formData[key] = value;
      }

      const data: Prisma.RegistrationUpdateManyMutationInput = {
        ...contact,
        ...(contact.university !== undefined ? { university: contact.university || null } : {}),
        ...(contact.ambassador !== undefined ? { ambassador: contact.ambassador || null } : {}),
        formData,
      };
      if (ambassadorCode !== undefined) {
        if (ambassadorCode) {
          const ambassador = await tx.ambassadorApplication.findUnique({
            where: { code: Number(ambassadorCode), campaign: AMBASSADOR_CAMPAIGN.id },
            select: { fullName: true },
          });
          if (!ambassador) throw new EditConflict("The ambassador code does not match an ambassador for these events.");
          formData.ambassadorCode = ambassadorCode;
          data.ambassador = ambassador.fullName;
        } else {
          delete formData.ambassadorCode;
          // Clearing the code and name removes the registration from that ambassador's roster.
          data.ambassador = contact.ambassador || null;
        }
        data.ambassadorVerifiedAt = null;
      }

      if (contact.email !== undefined && contact.email !== row.email) {
        const cnic = contact.cnic ?? row.cnic;
        const unrelated = await tx.registration.count({
          where: { email: contact.email, id: { not: id }, OR: [{ cnic: { not: cnic } }, { cnic: null }] },
        });
        if (unrelated) throw new EditConflict("That email belongs to another participant. Use a separate email address.");
        const oldAccount = await tx.participantAccount.findUnique({ where: { email: row.email } });
        const targetAccount = await tx.participantAccount.findUnique({ where: { email: contact.email } });
        const otherRegistrations = await tx.registration.count({ where: { email: row.email, id: { not: id } } });
        if (oldAccount && !targetAccount && !otherRegistrations) {
          const password = revealAmbassadorPassword(`participant:${row.email}`, oldAccount.issuedPassword);
          await tx.participantAccount.update({
            where: { email: row.email },
            data: { email: contact.email, issuedPassword: sealAmbassadorPassword(`participant:${contact.email}`, password), passwordReminderRequestedAt: null },
          });
        } else {
          await getOrIssueParticipantPassword(contact.email, tx);
        }
        data.emailSentAt = null;
      }

      const saved = await tx.registration.updateMany({
        where: { id, updatedAt: row.updatedAt },
        data: { ...data, formData },
      });
      if (saved.count !== 1) throw new EditConflict("The registration changed. Refresh the list and try again.");
      return tx.registration.findUniqueOrThrow({ where: { id }, select: participantSelect });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ message: "Registration updated.", registration }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof EditConflict) return NextResponse.json({ message: error.message }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "A registration with that CNIC already exists for this event." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ message: "Another update was saved at the same time. Refresh and try again." }, { status: 409 });
    }
    console.error("[registration-edit] Could not save registration");
    return NextResponse.json({ message: "Couldn't save changes. Try again." }, { status: 503 });
  }
}
