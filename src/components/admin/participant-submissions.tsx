"use client";

import { useState } from "react";
import type { Registration } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { getAmbassadorCode, getHncChoices, getTransportPreference, getUgxGame, UGX_GAMES } from "@/lib/validation/event-registration";
import { PaymentScreenshot } from "@/components/forms/payment-proof";
import { PaymentStatusSelect } from "./payment-status-select";
import { RegistrationPassword } from "./registration-password";
import {
  commonSorts, formatSubmittedAt, rosterButton, rosterItem, rosterList, rosterRow,
  RosterDetails, RosterField, RosterHeading, RosterPagination, RosterToolbar, useRoster,
} from "./roster-controls";

type ParticipantRow = Pick<Registration,
  "id" | "fullName" | "phone" | "email" | "cnic" | "city" | "university" | "ambassador" |
  "formData" | "paymentPaid" | "paymentProofPath" | "isPreRegistration" | "adminNotes"
> & { createdAt: string };

type ParticipantPage = {
  registrations: ParticipantRow[];
  ambassadorNames: Record<string, string>;
  total: number;
  pageSize: number;
};

export function ParticipantSubmissions({ eventId, eventSlug, eventTitle, canReviewPayments }: {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  canReviewPayments: boolean;
}) {
  const roster = useRoster<ParticipantPage>("/api/admin/registrations", new URLSearchParams({ eventId }).toString());
  const [expanded, setExpanded] = useState<string | null>(null);
  const ugx = eventSlug === "ugx";
  const choices = ugx ? UGX_GAMES : ["Participant", "Observer"];
  const data = roster.data;

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
        <RosterField label="Payment status" options={[["", "All payments"], ["paid", "Paid"], ["pending", "Payment pending"]]} value={roster.filters.payment ?? ""} onChange={(value) => roster.change("payment", value)} />
        <RosterField label="Screenshot" options={[["", "Any screenshot status"], ["uploaded", "Uploaded"], ["missing", "Missing"]]} value={roster.filters.proof ?? ""} onChange={(value) => roster.change("proof", value)} />
        <RosterField label={ugx ? "Game" : "Registration type"} options={[["", "All"], ...choices.map((choice) => [choice, choice] as const)]} value={roster.filters.choice ?? ""} onChange={(value) => roster.change("choice", value)} />
        <RosterField label="Transport" options={[["", "Any preference"], ["yes", "Yes"], ["no", "No"]]} value={roster.filters.transport ?? ""} onChange={(value) => roster.change("transport", value)} />
        {!ugx && <RosterField label="Socials opt-in" options={[["", "Any preference"], ["Yes", "Yes"], ["No", "No"]]} value={roster.filters.socials ?? ""} onChange={(value) => roster.change("socials", value)} />}
      </RosterToolbar>

      {roster.loading && <p role="status" className="py-6 text-sm text-[#B3B3B3]">Loading submissions…</p>}
      {roster.error && <p role="alert" className="py-6 text-sm text-[#FFB3BB]">{roster.error}</p>}
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
                            <PaymentStatusSelect id={row.id} name={row.fullName} paid={row.paymentPaid} proofPath={row.paymentProofPath} onPaidChange={roster.refresh} />
                          ) : (
                            <p className={row.paymentPaid ? "text-sm text-green-300" : "text-sm text-amber-200"}>{row.paymentPaid ? "Paid" : "Payment pending"}</p>
                          )}
                          <p className="mt-1 text-xs text-[#B3B3B3]">{row.paymentProofPath ? "Screenshot uploaded" : "No screenshot"}</p>
                        </div>
                        <button type="button" aria-expanded={open} aria-label={`${open ? "Hide" : "View"} details for ${row.fullName}`} onClick={() => setExpanded(open ? null : row.id)} className={`${rosterButton} justify-self-end self-end lg:justify-self-start lg:self-auto`}>
                          {open ? "Hide details" : "Details"} <ChevronDown size={14} aria-hidden="true" className={open ? "rotate-180" : undefined} />
                        </button>
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
                          {canReviewPayments && (
                            <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
                              <PaymentScreenshot id={row.id} hasProof={Boolean(row.paymentProofPath)} />
                              <RegistrationPassword endpoint={`/api/admin/registrations/${row.id}/credentials`} method="POST" />
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
