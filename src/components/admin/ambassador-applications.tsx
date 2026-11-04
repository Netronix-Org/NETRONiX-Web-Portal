"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AMBASSADOR_CAMPAIGN, type AmbassadorApplicationRow } from "@/lib/ambassadors";
import { RegistrationPassword } from "./registration-password";
import {
  commonSorts, formatSubmittedAt, rosterButton, rosterItem, rosterList, rosterRow,
  RosterDetails, RosterField, RosterHeading, RosterPagination, RosterToolbar, useRoster,
} from "./roster-controls";

type AmbassadorPage = {
  applications: AmbassadorApplicationRow[];
  expectedParticipants: number;
  total: number;
  pageSize: number;
};

export function AmbassadorApplications() {
  const roster = useRoster<AmbassadorPage>("/api/admin/ambassadors");
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section aria-labelledby="ambassador-applications-heading" className="grid min-w-0 gap-4">
      <div>
        <h2 id="ambassador-applications-heading" className="font-heading text-2xl font-semibold">HNC &amp; UGX ambassadors</h2>
        <p className="mt-2 text-sm text-[#B3B3B3]">{AMBASSADOR_CAMPAIGN.dates} {AMBASSADOR_CAMPAIGN.year} · Executive admin access</p>
      </div>
      <RosterToolbar
        {...roster}
        exportHref={roster.data?.total ? `/api/admin/ambassadors?format=csv&${roster.exportParams}` : undefined}
        placeholder="Name, code, email, phone or CNIC"
        sorts={[...commonSorts, ["participants", "Most expected participants"]]}
      >
        <RosterField label="University" placeholder="Any university" value={roster.filters.university ?? ""} onChange={(value) => roster.change("university", value)} />
        <RosterField label="Portal access" options={[["", "All applications"], ["ready", "Ready to sign in"], ["missing-email", "Missing email"], ["missing-password", "Password pending"]]} value={roster.filters.access ?? ""} onChange={(value) => roster.change("access", value)} />
      </RosterToolbar>

      {roster.loading && <p role="status" className="py-6 text-sm text-[#B3B3B3]">Loading applications…</p>}
      {roster.error && <p role="alert" className="py-6 text-sm text-[#FFB3BB]">{roster.error}</p>}
      {roster.data && (
        roster.data.total === 0 ? (
          <p role="status" className="rounded-xl border border-white/10 bg-[#141414] p-6 text-sm text-[#B3B3B3]">No ambassador applications match the current search and filters.</p>
        ) : (
          <>
            <div className="grid gap-2">
              <p className="text-sm text-[#B3B3B3]">{roster.data.expectedParticipants} expected participants across matching applications</p>
              <RosterPagination {...roster.data} page={roster.page} setPage={roster.setPage} />
            </div>
            <div className={rosterList}>
              <RosterHeading labels={["Ambassador", "University", "Expected participants", "Portal access", "Record"]} />
              {roster.data.applications.map((row) => {
                const open = expanded === row.id;
                return (
                  <article key={row.id} aria-label={row.fullName} className={rosterItem}>
                    <div className={rosterRow}>
                      <div className="col-span-2 min-w-0 lg:col-span-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <h3 className="min-w-0 break-words font-medium text-white">{row.fullName}</h3>
                          <span className="rounded-md border border-sky-300/20 bg-sky-300/10 px-1.5 font-mono text-xs text-sky-200">#{row.code}</span>
                        </div>
                        <p className="mt-1 break-words text-xs text-[#B3B3B3]">{row.email || "No email provided"}</p>
                        <p className="mt-0.5 text-xs text-[#B3B3B3]">{row.phone}</p>
                      </div>
                      <div className="min-w-0 break-words text-sm">
                        <p className="mb-1 text-xs text-[#B3B3B3] lg:sr-only">University</p>
                        <p>{row.university}</p>
                      </div>
                      <div className="text-sm">
                        <p className="mb-1 text-xs text-[#B3B3B3] lg:sr-only">Expected participants</p>
                        <p className="tabular-nums">{row.participantCount}</p>
                      </div>
                      <div className="self-end text-sm lg:self-auto">
                        <p className="mb-1 text-xs text-[#B3B3B3] lg:sr-only">Portal access</p>
                        {!row.email ? <p className="text-amber-200">Missing email</p>
                          : row.passwordIssued ? <p className="text-green-300">Ready to sign in</p>
                            : <p className="text-amber-200">Password pending</p>}
                      </div>
                      <button type="button" aria-expanded={open} aria-label={`${open ? "Hide" : "View"} details for ${row.fullName}`} onClick={() => setExpanded(open ? null : row.id)} className={`${rosterButton} justify-self-end self-end lg:justify-self-start lg:self-auto`}>
                        {open ? "Hide details" : "Details"} <ChevronDown size={14} aria-hidden="true" className={open ? "rotate-180" : undefined} />
                      </button>
                    </div>
                    {open && (
                      <RosterDetails fields={[
                        ["CNIC", row.cnic.replace(/^(\d{5})(\d{7})(\d)$/, "$1-$2-$3")],
                        ["Submitted (PKT)", formatSubmittedAt(row.createdAt)],
                        ["Ambassador code", row.code],
                      ]}>
                        <div className="border-t border-white/10 pt-3">
                          <p className="text-xs text-[#B3B3B3]">Portal password</p>
                          <RegistrationPassword endpoint={`/api/admin/ambassadors/${encodeURIComponent(row.id)}/credentials`} issued={row.passwordIssued} />
                        </div>
                      </RosterDetails>
                    )}
                  </article>
                );
              })}
            </div>
            {roster.data.total > roster.data.pageSize && <RosterPagination {...roster.data} page={roster.page} setPage={roster.setPage} />}
          </>
        )
      )}
    </section>
  );
}
