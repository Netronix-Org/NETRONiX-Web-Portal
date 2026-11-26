"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { registrationExportColumns } from "@/lib/registration-export-columns";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-medium text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300";
const filterLabels: Record<string, string> = {
  q: "Search", ambassador: "Ambassador", university: "University", city: "City",
  payment: "Payment", ambassadorVerification: "Ambassador verification", proof: "Screenshot",
  choice: "Event choice", transport: "Transport", socials: "Socials", sort: "Sort",
};
const filterValues: Record<string, string> = {
  paid: "Paid", pending: "Payment pending", refunded: "Refunded", rejected: "Rejected",
  verified: "Verified", unverified: "Unverified", uploaded: "Uploaded", missing: "Missing",
  yes: "Yes", no: "No", oldest: "Oldest first", name: "Name A–Z",
  university: "University A–Z", payment: "Payment pending first",
};

export function CustomCsvExport({ eventSlug, eventTitle, params, total, loading }: {
  eventSlug: string;
  eventTitle: string;
  params: string;
  total: number | undefined;
  loading: boolean;
}) {
  const columns = registrationExportColumns(eventSlug);
  const [selection, setSelection] = useState<string[]>(columns);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const activeFilters = [...new URLSearchParams(params)].filter(([key]) => key !== "eventId" && key !== "page");
  const exportReady = !loading && Boolean(total) && selection.length > 0 && !downloading;

  async function download() {
    if (!exportReady) return;
    setDownloading(true);
    setError("");
    try {
      const query = new URLSearchParams(params);
      query.delete("page");
      query.delete("column");
      for (const column of selection) query.append("column", column);
      const response = await fetch(`/api/admin/registrations/export?${query}`, { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message ?? "Couldn't export registrations. Try again.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `netronix-${eventSlug}-custom-registrations.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't download the CSV. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <details className="rounded-xl border border-white/10 bg-[#141414]">
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-medium text-sky-200 focus-visible:outline-2 focus-visible:outline-sky-300 sm:px-5">
        <Download size={16} aria-hidden="true" /> Custom CSV export
      </summary>
      <div className="space-y-4 border-t border-white/10 p-4 sm:p-5">
        <p className="text-sm text-neutral-300">
          {eventTitle} · {loading ? "Updating results…" : `${total ?? 0} matching registrations`}
        </p>
        <p className="text-xs leading-relaxed text-neutral-400">Exports include all matching results across every page, in the selected sort order.</p>
        {activeFilters.length > 0 ? (
          <ul aria-label="Export filters" className="flex flex-wrap gap-2">
            {activeFilters.map(([key, value]) => (
              <li key={key} className="max-w-full break-words rounded-md border border-white/10 px-2 py-1 text-xs text-neutral-300">
                {filterLabels[key] ?? key} · {key === "q" || key === "ambassador" || key === "university" || key === "city" ? value : filterValues[value] ?? value}
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-neutral-400">All registrations for this event.</p>}
        <fieldset disabled={downloading}>
          <legend className="text-sm font-medium text-white">Choose columns ({selection.length} of {columns.length})</legend>
          <div className="my-2 flex flex-wrap gap-4">
            <button type="button" onClick={() => setSelection(columns)} className="min-h-11 text-xs text-sky-200 underline underline-offset-4 disabled:opacity-50">Select all</button>
            <button type="button" onClick={() => setSelection([])} className="min-h-11 text-xs text-neutral-300 underline underline-offset-4 disabled:opacity-50">Clear selection</button>
          </div>
          <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            {columns.map((column) => (
              <label key={column} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={selection.includes(column)}
                  onChange={(event) => setSelection(event.target.checked
                    ? columns.filter((item) => selection.includes(item) || item === column)
                    : selection.filter((item) => item !== column))}
                  className="size-4 shrink-0 accent-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                />
                {column}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
        {selection.length === 0 && <p role="status" className="text-xs text-amber-200">Select at least one column to export.</p>}
        <button type="button" onClick={() => void download()} disabled={!exportReady} className={button}>
          {downloading ? <LoaderCircle size={16} aria-hidden="true" className="motion-safe:animate-spin" /> : <Download size={16} aria-hidden="true" />}
          {downloading ? "Exporting…" : "Download custom CSV"}
        </button>
      </div>
    </details>
  );
}
