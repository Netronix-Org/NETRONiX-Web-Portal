import type { Prisma } from "@prisma/client";

/** Shared projection for participant lists and successful admin edits. */
export const participantSelect = {
  id: true, fullName: true, phone: true, email: true, cnic: true, city: true,
  university: true, ambassador: true, formData: true, paymentPaid: true,
  paymentDisposition: true, paymentProofPath: true, ambassadorVerifiedAt: true,
  isPreRegistration: true, adminNotes: true, createdAt: true, updatedAt: true,
} satisfies Prisma.RegistrationSelect;

type ParticipantRecord = Prisma.RegistrationGetPayload<{ select: typeof participantSelect }>;
export type AdminParticipant = Omit<ParticipantRecord, "createdAt" | "updatedAt" | "ambassadorVerifiedAt"> & {
  createdAt: string;
  updatedAt: string;
  ambassadorVerifiedAt: string | null;
};
