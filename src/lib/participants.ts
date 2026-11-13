export const PARTICIPANT_PORTAL_URL = "https://www.netronixgiki.com/participants/portal";
export const PARTICIPANT_EVENT_SLUGS = ["hack-n-connect", "ugx"];
export const PAYMENT_BUCKET = "participant-payment-proofs";
export const PAYMENT_MAX_BYTES = 3 * 1024 * 1024;
export const PAYMENT_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const PAYMENT_STATUSES = ["pending", "paid", "refunded", "rejected"] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: "Payment pending",
  paid: "Verified by NETRONiX",
  refunded: "Refunded",
  rejected: "Rejected",
};

export const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  pending: "text-amber-200",
  paid: "text-green-300",
  refunded: "text-sky-300",
  rejected: "text-rose-300",
};

export function getPaymentStatus(record: { paymentPaid: boolean; paymentDisposition: "refunded" | "rejected" | null }): PaymentStatus {
  return record.paymentDisposition ?? (record.paymentPaid ? "paid" : "pending");
}
