"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { AMBASSADOR_CAMPAIGN, type AmbassadorApplicationRow } from "@/lib/ambassadors";

export function AmbassadorApplications() {
  const [applications, setApplications] = useState<AmbassadorApplicationRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/ambassadors", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load applications");
        const data = await response.json();
        if (controller.signal.aborted) return;
        setApplications(data.applications);
        setStatus("ready");
      })
      .catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [attempt]);

  function refresh() {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch("/api/admin/ambassadors?format=csv", { cache: "no-store" });
      if (!response.ok) throw new Error("Export failed");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `netronix-ambassadors-${AMBASSADOR_CAMPAIGN.id}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError("Couldn't export applications. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section aria-labelledby="ambassador-applications-heading" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="ambassador-applications-heading" className="font-heading text-2xl font-semibold">HNC &amp; UGX ambassadors</h2>
          <p className="mt-2 text-sm text-[#B3B3B3]">{AMBASSADOR_CAMPAIGN.dates} {AMBASSADOR_CAMPAIGN.year} · Executive admin access</p>
          {status === "ready" && <p className="mt-2 text-sm text-[#B3B3B3]">{applications.length} applications · {applications.reduce((sum, a) => sum + a.participantCount, 0)} expected participants</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={refresh} disabled={status === "loading"} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm hover:bg-white/5 disabled:opacity-50"><RefreshCw size={15} aria-hidden="true" />Refresh</button>
          <button onClick={exportCsv} disabled={exporting || status !== "ready" || applications.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm hover:bg-white/5 disabled:opacity-50"><Download size={15} aria-hidden="true" />{exporting ? "Exporting…" : "Export CSV"}</button>
        </div>
      </div>
      {exportError && <p role="alert" className="text-sm text-[#FF8B96]">{exportError}</p>}
      {status === "loading" ? (
        <p role="status" className="inline-flex items-center gap-2 py-8 text-sm text-[#B3B3B3]"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Loading applications…</p>
      ) : status === "error" ? (
        <p role="alert" className="rounded-xl border border-white/10 bg-[#141414] p-6 text-sm text-[#FFB3BB]">Couldn&apos;t load applications. Use Refresh to try again.</p>
      ) : applications.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-[#141414] p-8 text-sm text-[#B3B3B3]">No ambassador applications yet. New applications will appear here.</p>
      ) : (
        <div role="region" aria-label="Ambassador applications" tabIndex={0} className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <caption className="sr-only">Ambassador applications for HNC and UGX, {AMBASSADOR_CAMPAIGN.dates}</caption>
            <thead className="bg-[#141414] text-xs text-[#B3B3B3]"><tr>{["Name", "CNIC", "Phone", "Email", "University", "Participants", "Submitted"].map((label) => <th key={label} scope="col" className="px-4 py-4 font-medium">{label}</th>)}</tr></thead>
            <tbody>{applications.map((a) => <tr key={a.id} className="border-t border-white/10 align-top">
              <td className="px-4 py-4">{a.fullName}</td>
              <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-[#B3B3B3]">{a.cnic.replace(/^(\d{5})(\d{7})(\d)$/, "$1-$2-$3")}</td>
              <td className="whitespace-nowrap px-4 py-4 text-[#B3B3B3]">{a.phone}</td>
              <td className="max-w-64 break-words px-4 py-4 text-[#B3B3B3]">{a.email || "—"}</td>
              <td className="max-w-64 break-words px-4 py-4 text-[#B3B3B3]">{a.university}</td>
              <td className="px-4 py-4 tabular-nums">{a.participantCount}</td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-[#B3B3B3]">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(a.createdAt))}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
