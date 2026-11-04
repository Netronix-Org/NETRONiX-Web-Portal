"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Download, RefreshCw, Search, SlidersHorizontal } from "lucide-react";

type RosterPage = { total: number; pageSize: number };
type Result<T> = { key: string; data?: T; error?: string };
type Option = readonly [value: string, label: string];

export const rosterButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300";
const field = "min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-[#0F0F10] px-3 text-sm text-white placeholder:text-[#A0A0A7] focus-visible:outline-2 focus-visible:outline-sky-300";
const rosterColumns = "grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_7.5rem] lg:items-center";
export const rosterRow = `${rosterColumns} px-4 py-4 sm:px-5`;
export const rosterList = "grid gap-3 lg:gap-0 lg:divide-y lg:divide-white/10 lg:rounded-xl lg:border lg:border-white/10 lg:bg-[#141414]";
export const rosterItem = "min-w-0 rounded-xl border border-white/10 bg-[#141414] lg:rounded-none lg:border-0 lg:bg-transparent";

export const commonSorts = [
  ["", "Newest first"], ["oldest", "Oldest first"], ["name", "Name A–Z"], ["university", "University A–Z"],
] as const;

export function useRoster<T extends RosterPage>(endpoint: string, baseParams = "") {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  const params = new URLSearchParams(baseParams);
  for (const [name, value] of Object.entries(filters)) {
    if (value.trim()) params.set(name, value.trim());
  }
  const exportParams = params.toString();
  params.set("page", String(page));
  const url = `${endpoint}?${params}`;
  const key = `${url}#${revision}`;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.message || "Couldn’t load records. Use Refresh to try again.");
        }
        const data: T = await response.json();
        if (controller.signal.aborted) return;
        const lastPage = Math.max(0, Math.ceil(data.total / data.pageSize) - 1);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResult({ key, data });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ key, error: error instanceof Error ? error.message : "Couldn’t load records." });
        }
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, page, url]);

  const current = result?.key === key ? result : null;
  return {
    filters,
    change: (name: string, value: string) => {
      setFilters((previous) => ({ ...previous, [name]: value }));
      setPage(0);
    },
    clear: () => { setFilters({}); setPage(0); },
    refresh: () => setRevision((value) => value + 1),
    exportParams,
    data: current?.data,
    error: current?.error,
    loading: !current,
    page,
    setPage,
  };
}

export function RosterField({ label, value, onChange, options, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: readonly Option[];
  placeholder?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[#D4D4D4]">
      {label}
      {options ? (
        <select className={field} value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map(([key, title]) => <option key={key} value={key}>{title}</option>)}
        </select>
      ) : (
        <input className={field} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={200} />
      )}
    </label>
  );
}

export function RosterToolbar({ filters, change, clear, refresh, loading, exportHref, placeholder, sorts, children }: {
  filters: Record<string, string>;
  change: (name: string, value: string) => void;
  clear: () => void;
  refresh: () => void;
  loading: boolean;
  exportHref?: string;
  placeholder: string;
  sorts: readonly Option[];
  children: ReactNode;
}) {
  const active = Object.entries(filters).filter(([, value]) => value.trim());
  const filterCount = active.filter(([name]) => name !== "q" && name !== "sort").length;
  return (
    <div className="rounded-xl border border-white/10 bg-[#141414] p-4 sm:p-5">
      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.48fr)_auto]">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[#D4D4D4]">
          Search
          <span className="relative block">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-3.5 left-3 text-[#A0A0A7]" />
            <input type="search" className={`${field} pl-9`} value={filters.q ?? ""} onChange={(event) => change("q", event.target.value)} placeholder={placeholder} maxLength={200} />
          </span>
        </label>
        <RosterField label="Sort by" value={filters.sort ?? ""} onChange={(value) => change("sort", value)} options={sorts} />
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
          <button type="button" onClick={refresh} disabled={loading} className={rosterButton}><RefreshCw size={15} aria-hidden="true" /> Refresh</button>
          {exportHref && <a href={exportHref} className={rosterButton}><Download size={15} aria-hidden="true" /> Export CSV</a>}
          {active.length > 0 && <button type="button" onClick={clear} className="min-h-11 px-1 text-sm font-medium text-sky-300 underline underline-offset-4">Clear all</button>}
        </div>
      </div>
      <div className="mt-4 border-t border-white/10">
        <details className="group">
          <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 pr-3 text-sm font-medium text-white marker:content-none [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal size={16} aria-hidden="true" /> Filters{filterCount > 0 ? ` (${filterCount})` : ""}
            <ChevronDown size={15} aria-hidden="true" className="group-open:rotate-180" />
          </summary>
          <div className="grid gap-3 pb-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
        </details>
      </div>
    </div>
  );
}

export function RosterPagination({ page, total, pageSize, setPage }: RosterPage & { page: number; setPage: (page: number) => void }) {
  if (!total) return null;
  const pages = Math.ceil(total / pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-sm text-[#B3B3B3]">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total} matching records</p>
      {pages > 1 && <nav aria-label="Results pages" className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className={rosterButton}>Previous</button>
        <span className="text-sm text-[#B3B3B3]">Page {page + 1} of {pages}</span>
        <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className={rosterButton}>Next</button>
      </nav>}
    </div>
  );
}

export function RosterHeading({ labels }: { labels: readonly string[] }) {
  return <div aria-hidden="true" className={`${rosterRow} rounded-t-xl bg-white/[0.03] text-xs font-medium text-[#B3B3B3] max-lg:hidden`}>{labels.map((label) => <span key={label}>{label}</span>)}</div>;
}

const submittedAt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" });

export function RosterDetails({ fields, children }: { fields: [string, ReactNode][]; children?: ReactNode }) {
  return (
    <div className="grid gap-4 border-t border-white/10 bg-black/20 px-4 py-4 sm:px-5">
      <dl className="grid min-w-0 grid-cols-2 gap-4 md:grid-cols-3">
        {fields.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-[#B3B3B3]">{label}</dt>
            <dd className="mt-1 break-words text-sm text-white">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      {children}
    </div>
  );
}

export function formatSubmittedAt(value: string) {
  return submittedAt.format(new Date(value));
}
