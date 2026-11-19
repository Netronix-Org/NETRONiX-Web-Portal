"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Registration } from "@prisma/client";
import { ChevronDown, LoaderCircle, Trash2 } from "lucide-react";
import { getAmbassadorCode, getHncChoices, getTransportPreference, getUgxGame, UGX_GAMES } from "@/lib/validation/event-registration";
import { PaymentScreenshot } from "@/components/forms/payment-proof";
import { getPaymentStatus, PAYMENT_COLORS, PAYMENT_LABELS, PAYMENT_STATUSES } from "@/lib/participants";
import { PaymentStatusSelect } from "./payment-status-select";
import { RegistrationPassword } from "./registration-password";
import {
  commonSorts, formatSubmittedAt, rosterItem, rosterList, rosterRow,
  RosterDetails, RosterField, RosterHeading, RosterPagination, RosterToolbar, useRoster,
} from "./roster-controls";

type ParticipantRow = Pick<Registration,
  "id" | "fullName" | "phone" | "email" | "cnic" | "city" | "university" | "ambassador" |
  "formData" | "paymentPaid" | "paymentDisposition" | "paymentProofPath" | "isPreRegistration" | "adminNotes"
> & { createdAt: string };

type ParticipantPage = {
  registrations: (ParticipantRow & { ambassadorVerifiedAt: string | null })[];
  ambassadorNames: Record<string, string>;
  total: number;
  pageSize: number;
};

export function ParticipantSubmissions({ eventId, eventSlug, eventTitle, canDeleteRegistrations, canReviewPayments, canViewScreenshots }: {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  canDeleteRegistrations: boolean;
  canReviewPayments: boolean;
  canViewScreenshots: boolean;
}) {
  const router = useRouter();
  const roster = useRoster<ParticipantPage>("/api/admin/registrations", new URLSearchParams({ eventId }).toString());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const ugx = eventSlug === "ugx";
  const choices = ugx ? UGX_GAMES : ["Participant", "Observer"];
  const data = roster.data;

  async function deleteRegistration(row: ParticipantRow) {
    if (!canDeleteRegistrations || deleting || !window.confirm(
      `Permanently delete ${row.fullName}’s registration for ${eventTitle}? Any uploaded payment screenshot will also be removed.`,
    )) return;

    setDeleting(row.id);
    setDeleteFeedback(null);
    try {
      const response = await fetch(`/api/admin/registrations?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Couldn't delete the registration. Try again.");
      }
      setExpanded((current) => current === row.id ? null : current);
      setDeleteFeedback({
        message: response.ok ? `Deleted ${row.fullName}’s registration.` : "This registration is already gone.",
        error: false,
      });
      roster.refresh();
      router.refresh();
    } catch (error) {
      setDeleteFeedback({ message: error instanceof Error ? error.message : "Couldn't delete the registration. Try again.", error: true });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <h2 className="font-heading text-2xl font-semibold">{eventTitle} submissions</h2>
      <RosterToolbar
        {...roster}
        exportHref={data?.total ? `/api/admin/registrations/export?${roster.exportParams}` : undefined}
        placeholder="Name, email, phone, CNIC or ambassador code"
        sorts={[...commonSorts, ["payment", "Payment pending first"]]}
      >
        <RosterField label="Ambassador" placeholder="Name or four-digit code" value={roster.filters.ambassador ?? ""} onChange={(value) => roster.change("ambassador", value)} />
        <RosterField label="University" placeholder="Any university" value={roster.filters.university ?? ""} onChange={(value) => roster.change("university", value)} />
        <RosterField label="City" placeholder="Any city" value={roster.filters.city ?? ""} onChange={(value) => roster.change("city", value)} />
        <RosterField label="Payment status" options={[["", "All payments"], ...PAYMENT_STATUSES.map((status) => [status, PAYMENT_LABELS[status]] as const)]} value={roster.filters.payment ?? ""} onChange={(value) => roster.change("payment", value)} />
        <RosterField label="Ambassador verification" options={[["", "Any"], ["verified", "Verified by ambassador"], ["unverified", "Unverified by ambassador"]]} value={roster.filters.ambassadorVerification ?? ""} onChange={(value) => roster.change("ambassadorVerification", value)} />
        <RosterField label="Screenshot" options={[["", "Any screenshot status"], ["uploaded", "Uploaded"], ["missing", "Missing"]]} value={roster.filters.proof ?? ""} onChange={(value) => roster.change("proof", value)} />
        <RosterField label={ugx ? "Game" : "Registration type"} options={[["", "All"], ...choices.map((choice) => [choice, choice] as const)]} value={roster.filters.choice ?? ""} onChange={(value) => roster.change("choice", value)} />
        <RosterField label="Transport" options={[["", "Any preference"], ["yes", "Yes"], ["no", "No"]]} value={roster.filters.transport ?? ""} onChange={(value) => roster.change("transport", value)} />
        {!ugx && <RosterField label="Socials opt-in" options={[["", "Any preference"], ["Yes", "Yes"], ["No", "No"]]} value={roster.filters.socials ?? ""} onChange={(value) => roster.change("socials", value)} />}
      </RosterToolbar>

      {roster.loading && <p role="status" className="py-6 text-sm text-[#B3B3B3]">Loading submissions…</p>}
      {roster.error && <p role="alert" className="py-6 text-sm text-[#FFB3BB]">{roster.error}</p>}
      {deleteFeedback && (
        <p role={deleteFeedback.error ? "alert" : "status"} className={`text-sm ${deleteFeedback.error ? "text-[#FFB3BB]" : "text-[#B3B3B3]"}`}>
          {deleteFeedback.message}
        </p>
      )}
      {data && (
        <>
          {data.total === 0 ? (
            <p role="status" className="rounded-xl border border-white/10 bg-[#141414] p-6 text-sm text-[#B3B3B3]">No submissions for {eventTitle} match the current search and filters.</p>
          ) : (
            <>
              <RosterPagination {...data} page={roster.page} setPage={roster.setPage} />
              <div className={rosterList}>
                <RosterHeading labels={["Participant", "University / city", "Ambassador", "Payment", "Record"]} />
                {data.registrations.map((row) => {
                  const open = expanded === row.id;
                  const paymentStatus = getPaymentStatus(row);
                  const code = getAmbassadorCode(row.formData);
                  const ambassador = (code && data.ambassadorNames[code]) || row.ambassador;
                  const hncChoices = getHncChoices(row.formData);
                  const eventDetails: [string, string | null | undefined][] = ugx
                    ? [["Game", getUgxGame(row.formData)]]
                    : [["Registration type", hncChoices.registrationType], ["Socials opt-in", hncChoices.socials]];

                  return (
                    <article key={row.id} aria-label={row.fullName} className={rosterItem}>
                      <div className={rosterRow}>
                        <div className="col-span-2 min-w-0 lg:col-span-1">
                          <h3 className="break-words font-medium text-white">{row.fullName}</h3>
                          <p className="mt-1 break-words text-xs text-[#B3B3B3]">{row.email}</p>
                          <p className="mt-0.5 text-xs text-[#B3B3B3]">{row.phone}</p>
                        </div>
                        <div className="min-w-0 break-words text-sm">
                          <p className="mb-1 text-xs text-[#B3B3B3] lg:sr-only">University / city</p>
                          <p>{row.university || "—"}</p>
                          <p className="mt-0.5 text-xs text-[#B3B3B3]">{row.city || "—"}</p>
                        </div>
                        <div className="min-w-0 break-words text-sm">
                          <p className="mb-1 text-xs text-[#B3B3B3] lg:sr-only">Ambassador</p>
                          <p>{ambassador || "—"}</p>
                          {code && <p className="mt-0.5 font-mono text-xs text-[#B3B3B3]">#{code}</p>}
                        </div>
                        <div className="min-w-0 self-end lg:self-auto">
                          <p className="mb-1 text-xs text-[#B3B3B3] lg:sr-only">Payment</p>
                          {canReviewPayments ? (
                            <PaymentStatusSelect id={row.id} name={row.fullName} status={paymentStatus} proofPath={row.paymentProofPath} onStatusChange={roster.refresh} />
                          ) : (
                            <p className={`text-sm ${PAYMENT_COLORS[paymentStatus]}`}>{PAYMENT_LABELS[paymentStatus]}</p>
                          )}
                          <p className="mt-1 text-xs text-[#B3B3B3]">{row.paymentProofPath ? "Screenshot uploaded" : "No screenshot"}</p>
                          {row.ambassadorVerifiedAt && <p className="mt-1 text-xs text-sky-300">Verified by ambassador</p>}
                        </div>
                        <div className="col-span-2 flex min-w-0 items-center justify-end gap-1 self-end lg:col-span-1 lg:justify-start lg:self-auto">
                          <button type="button" aria-expanded={open} aria-label={`${open ? "Hide" : "View"} details for ${row.fullName}`} onClick={() => setExpanded(open ? null : row.id)} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg border border-white/15 px-2 text-xs font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 lg:flex-1">
                            {open ? "Hide" : "Details"} <ChevronDown size={12} aria-hidden="true" className={open ? "rotate-180" : undefined} />
                          </button>
                          {canDeleteRegistrations && (
                            <button
                              type="button"
                              aria-label={`Delete registration for ${row.fullName}`}
                              title={deleting === row.id ? "Deleting registration…" : "Delete registration"}
                              aria-busy={deleting === row.id}
                              disabled={deleting !== null}
                              onClick={() => void deleteRegistration(row)}
                              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-rose-400/10 hover:text-rose-200 focus-visible:bg-rose-400/10 focus-visible:text-rose-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-wait disabled:opacity-40"
                            >
                              {deleting === row.id
                                ? <LoaderCircle size={16} aria-hidden="true" className="motion-safe:animate-spin" />
                                : <Trash2 size={16} aria-hidden="true" />}
                              <span className="sr-only">{deleting === row.id ? "Deleting…" : "Delete registration"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                      {open && (
                        <RosterDetails fields={[
                          ["CNIC", row.cnic],
                          ["Submitted (PKT)", formatSubmittedAt(row.createdAt)],
                          ["Submission type", row.isPreRegistration ? "Pre-registration" : "Registration"],
                          ["Transport", getTransportPreference(row.formData)],
                          ...eventDetails,
                          ...(row.adminNotes ? [["Admin notes", row.adminNotes] as [string, string]] : []),
                        ]}>
                          {(canViewScreenshots || canReviewPayments) && (
                            <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
                              {canViewScreenshots && <PaymentScreenshot id={row.id} hasProof={Boolean(row.paymentProofPath)} />}
                              {canReviewPayments && (
                                <RegistrationPassword endpoint={`/api/admin/registrations/${row.id}/credentials`} method="POST" />
                              )}
                            </div>
                          )}
                        </RosterDetails>
                      )}
                    </article>
                  );
                })}
              </div>
              {data.total > data.pageSize && <RosterPagination {...data} page={roster.page} setPage={roster.setPage} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
