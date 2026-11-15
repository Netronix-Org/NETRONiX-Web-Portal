"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, RefreshCw, Search } from "lucide-react";
import {
  EXECUTIVE_EVENTS,
  type ExecutiveEvent,
  type ExecutiveOverview,
  type ExecutiveRegistration,
} from "@/lib/admin-executive";
import { PAYMENT_COLORS, PAYMENT_LABELS } from "@/lib/participants";

const EVENT_STYLE = {
  "hack-n-connect": { border: "border-t-sky-500", label: "text-sky-300" },
  ugx: { border: "border-t-rose-500", label: "text-rose-300" },
} satisfies Record<ExecutiveEvent, { border: string; label: string }>;

type CountItem = [label: string, count: number];

function Breakdown({ title, items }: { title: string; items: CountItem[] }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-medium text-neutral-400">{title}</h4>
      <dl className="space-y-1.5 text-sm">
        {items.map(([label, count]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-neutral-300">{label}</dt>
            <dd className="font-mono tabular-nums text-white">{count}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EventSummary({
  event,
  summary,
  onView,
}: {
  event: ExecutiveEvent;
  summary: ExecutiveOverview["overall"];
  onView: () => void;
}) {
  const { payment, transport, socials, hncTypes, ugxGames } = summary;
  const isHnc = event === "hack-n-connect";
  const style = EVENT_STYLE[event];

  return (
    <article className={`rounded-2xl border border-white/10 border-t-2 bg-neutral-950 p-5 sm:p-6 ${style.border}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={`font-heading text-xl font-semibold ${style.label}`}>{EXECUTIVE_EVENTS[event]}</h3>
          <p className="mt-1 text-sm text-neutral-400">
            <span className="font-mono text-xl tabular-nums text-white">{summary.total}</span> registrations
          </p>
        </div>
        <button type="button" onClick={onView} className="inline-flex items-center gap-1 text-xs text-neutral-300 transition-colors hover:text-white">
          Submissions <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </button>
      </header>
      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-white/10 pt-5">
        <Breakdown title="Payments" items={[
          ["Paid", payment.paid], ["Pending", payment.pending], ["Refunded", payment.refunded], ["Rejected", payment.rejected],
        ]} />
        <Breakdown title="Transport" items={[
          ["Requested", transport.Yes], ["Declined", transport.No], ["Unspecified", transport.Unspecified],
        ]} />
        <Breakdown title={isHnc ? "Registration type" : "Game"} items={Object.entries(isHnc ? hncTypes : ugxGames)} />
        {isHnc && <Breakdown title="Socials" items={[
          ["Opted in", socials.Yes], ["Declined", socials.No], ["Unspecified", socials.Unspecified],
        ]} />}
      </div>
      <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 pt-4 text-xs text-neutral-400">
        <span><strong className="font-mono text-neutral-200">{summary.proofs}</strong> proof uploaded</span>
        <span><strong className="font-mono text-neutral-200">{summary.awaitingNetronix}</strong> ambassador-verified and awaiting NETRONiX</span>
      </p>
    </article>
  );
}

function ReferralRoster({
  title,
  subtitle,
  rows,
  matchingRows,
  showSubmittedReferral = false,
}: {
  title: string;
  subtitle: string;
  rows: ExecutiveRegistration[];
  matchingRows?: ExecutiveRegistration[];
  showSubmittedReferral?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hnc = rows.filter((row) => row.event === "hack-n-connect");
  const visibleRows = matchingRows ?? rows;
  const ugx = rows.filter((row) => row.event === "ugx");
  const paid = rows.filter((row) => row.payment === "paid").length;
  const pending = rows.filter((row) => row.payment === "pending").length;
  const transport = rows.filter((row) => row.transport === "Yes").length;
  const socials = hnc.filter((row) => row.socials === "Yes").length;

  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)} className="group border-t border-white/10">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-4 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-sky-400 sm:px-5 lg:grid-cols-[minmax(12rem,1fr)_auto_auto] [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="break-words font-medium text-white">{title}</p>
          <p className="mt-0.5 break-words text-xs text-neutral-400">{subtitle}</p>
        </div>
        <div className="col-span-2 row-start-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <span><b className="font-mono text-sky-300">{hnc.length}</b> HNC</span>
          <span><b className="font-mono text-rose-300">{ugx.length}</b> UGX</span>
          <span><b className="font-mono text-emerald-300">{paid}</b> paid</span>
          <span><b className="font-mono text-amber-200">{pending}</b> pending</span>
          <span><b className="font-mono text-neutral-200">{transport}</b> transport</span>
          <span><b className="font-mono text-neutral-200">{socials}</b> socials</span>
        </div>
        <ChevronDown className="col-start-2 row-start-1 size-4 text-neutral-400 group-open:rotate-180 lg:col-start-3" aria-hidden="true" />
      </summary>
      {open && rows.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/5 px-4 py-3 text-xs text-neutral-400 sm:px-5">
          {hnc.length > 0 && (
            <p><span className="text-sky-300">HNC</span> · {hnc.filter((row) => row.option === "Participant").length} participants · {hnc.filter((row) => row.option === "Observer").length} observers</p>
          )}
          {ugx.length > 0 && (
            <p><span className="text-rose-300">UGX</span> · {ugx.filter((row) => row.option === "FC26").length} FC26 · {ugx.filter((row) => row.option === "Tekken 8").length} Tekken 8</p>
          )}
        </div>
      )}
      {open && matchingRows && (
        <p role="status" className="border-t border-white/5 px-4 py-2 text-xs text-neutral-400 sm:px-5">
          {matchingRows.length} of {rows.length} registrations match the search
        </p>
      )}
      {open && (visibleRows.length ? (
        <ul className="divide-y divide-white/5 border-t border-white/5 bg-black/30 px-4 sm:px-5">
          {visibleRows.map((row) => (
            <li key={row.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] sm:gap-4">
              <div className="min-w-0 break-words">
                <p className="font-medium text-white">{row.name}</p>
                <p className="mt-0.5 text-xs text-neutral-400">{row.city ?? "City unspecified"}</p>
                {showSubmittedReferral && (row.referralName || row.referralCode) && (
                  <p className="mt-1 text-xs text-neutral-400">Entered referral {row.referralName} {row.referralCode}</p>
                )}
              </div>
              <div className="text-xs text-neutral-300">
                <p><span className={EVENT_STYLE[row.event].label}>{EXECUTIVE_EVENTS[row.event]}</span> · {row.option}</p>
                <p className="mt-1">
                  Transport {row.transport.toLowerCase()}
                  {row.event === "hack-n-connect" && <> · Socials {row.socials.toLowerCase()}</>}
                </p>
              </div>
              <div className="text-xs">
                <p className={PAYMENT_COLORS[row.payment]}>{PAYMENT_LABELS[row.payment]}</p>
                <p className="mt-1 text-neutral-400">
                  {row.hasProof ? "Proof uploaded" : "No proof uploaded"}
                  {row.ambassadorVerified && " · Ambassador verified"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 pb-4 text-sm text-neutral-400">No registrations in this group.</p>
      ))}
    </details>
  );
}

export function ExecutiveOverviewPanel({ onViewSubmissions }: { onViewSubmissions: (event: ExecutiveEvent) => void }) {
  const [data, setData] = useState<ExecutiveOverview>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [request, setRequest] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/admin/executive", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Couldn't load the latest dashboard data.");
        const overview = await response.json() as ExecutiveOverview;
        if (!controller.signal.aborted) setData(overview);
      } catch {
        if (!controller.signal.aborted) {
          setData(undefined);
          setError("Couldn't load the latest dashboard data. Select Refresh to retry.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [request]);

  function refresh() {
    setError("");
    setLoading(true);
    setRequest((current) => current + 1);
  }

  const query = search.trim().toLowerCase();
  const matchesRegistration = (row: ExecutiveRegistration) =>
    [row.name, row.referralName, row.referralCode].some((value) => value?.toLowerCase().includes(query));
  const ambassadors = (data?.ambassadors ?? []).flatMap((ambassador) => {
    const matchesAmbassador = [ambassador.fullName, ambassador.university, String(ambassador.code)]
      .some((value) => value.toLowerCase().includes(query));
    const matchingRows = matchesAmbassador ? undefined : ambassador.registrations.filter(matchesRegistration);
    return matchingRows?.length === 0 ? [] : [{ ...ambassador, matchingRows }];
  });
  const matchingUnassigned = query ? data?.unassigned.filter(matchesRegistration) : undefined;
  const showUnassigned = (matchingUnassigned ?? data?.unassigned ?? []).length > 0;
  const expected = data?.ambassadors.reduce((total, ambassador) => total + ambassador.participantCount, 0) ?? 0;
  const activeAmbassadors = data?.ambassadors.filter((ambassador) => ambassador.registrations.length > 0).length ?? 0;

  return (
    <section aria-labelledby="executive-title" className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="executive-title" className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Executive dashboard
          </h2>
          <p className="mt-1 text-sm text-neutral-400">HNC and UGX registrations, payments and ambassador referrals.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-neutral-200 hover:bg-white/5 disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 ${loading ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-500/30 p-4 text-sm text-rose-200">{error}</p>}
      {loading && !data && <p role="status" className="text-sm text-neutral-400">Loading registrations…</p>}

      {data && (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              ["Registrations", data.overall.total],
              ["Paid", data.overall.payment.paid],
              ["Transport requests", data.overall.transport.Yes],
              ["Ambassador referrals", data.referred],
            ].map(([label, count]) => (
              <div key={label} className="bg-neutral-950 px-4 py-4 sm:px-6">
                <dt className="text-xs text-neutral-400">{label}</dt>
                <dd className="mt-1 font-heading text-3xl font-semibold tabular-nums tracking-tight text-white">{count}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-neutral-400">Counts include all submitted registrations. A person registered for both events counts once per event.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <EventSummary event="hack-n-connect" summary={data.events["hack-n-connect"]} onView={() => onViewSubmissions("hack-n-connect")} />
            <EventSummary event="ugx" summary={data.events.ugx} onView={() => onViewSubmissions("ugx")} />
          </div>

          <section aria-labelledby="transport-totals" className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
            <header className="px-4 py-4 sm:px-5">
              <h3 id="transport-totals" className="font-heading text-lg font-semibold text-white">Transport requests by university</h3>
              <p className="mt-1 text-xs text-neutral-400">Requests are grouped by city when no university was entered. Current service covers Islamabad, Peshawar and Haripur.</p>
            </header>
            {data.transportGroups.length ? (
              <table className="w-full border-t border-white/10 text-left text-xs sm:text-sm">
                <thead className="text-neutral-400">
                  <tr className="[&>th]:px-2 [&>th]:py-2.5 [&>th]:font-medium sm:[&>th]:px-4">
                    <th scope="col" className="pl-4!">University or city</th>
                    <th scope="col" className="text-right text-sky-300">HNC</th>
                    <th scope="col" className="text-right text-rose-300">UGX</th>
                    <th scope="col" className="text-right">Requests</th>
                    <th scope="col" className="pr-4! text-right">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 border-t border-white/5 tabular-nums">
                  {data.transportGroups.map(({ key, label, source, hnc, ugx, paid }) => (
                    <tr key={key} className="[&>td]:px-2 [&>td]:py-2.5 sm:[&>td]:px-4">
                      <th scope="row" className="wrap-anywhere py-2.5 pl-4 text-neutral-200">
                        {label}
                        {source === "city" && <span className="block text-xs font-normal text-neutral-400">City</span>}
                      </th>
                      <td className="text-right text-neutral-300">{hnc}</td>
                      <td className="text-right text-neutral-300">{ugx}</td>
                      <td className="text-right text-white">{hnc + ugx}</td>
                      <td className="pr-4! text-right text-emerald-300">{paid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="border-t border-white/10 px-4 py-4 text-sm text-neutral-400 sm:px-5">No transport requests yet.</p>
            )}
          </section>

          <section aria-labelledby="referral-totals" className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
            <header className="flex flex-wrap items-end justify-between gap-4 px-4 py-4 sm:px-5">
              <div>
                <h3 id="referral-totals" className="font-heading text-lg font-semibold text-white">Ambassador rosters</h3>
                <p className="mt-1 text-xs text-neutral-400">
                  {data.ambassadors.length} ambassadors · {activeAmbassadors} with referrals · {expected} participants expected
                </p>
              </div>
              <label className="relative w-full sm:w-72">
                <span className="sr-only">Search by ambassador, university, code or registrant</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search names, universities or codes"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 py-2 pr-2 pl-9 text-sm text-white placeholder:text-neutral-500 focus:border-sky-400 focus:outline-none"
                />
              </label>
            </header>
            {ambassadors.map((ambassador) => (
              <ReferralRoster
                key={ambassador.code}
                title={ambassador.fullName}
                subtitle={`Code ${ambassador.code} · ${ambassador.university} · ${ambassador.participantCount} expected`}
                rows={ambassador.registrations}
                matchingRows={ambassador.matchingRows}
              />
            ))}
            {showUnassigned && (
              <ReferralRoster
                title="Registrations without a matched ambassador"
                subtitle={`${data.unassigned.length} registrations · ${data.unlinkedReferrals} with an unmatched name or code`}
                rows={data.unassigned}
                matchingRows={matchingUnassigned}
                showSubmittedReferral
              />
            )}
            {ambassadors.length === 0 && !showUnassigned && (
              <p className="border-t border-white/10 px-4 py-4 text-sm text-neutral-400 sm:px-5">
                {query ? "No rosters match this search." : "No ambassador rosters or unmatched registrations yet."}
              </p>
            )}
          </section>
        </>
      )}
    </section>
  );
}
