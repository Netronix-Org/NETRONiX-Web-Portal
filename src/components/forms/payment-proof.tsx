"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { Check, Download, Eye, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PAYMENT_COLORS, PAYMENT_IMAGE_TYPES, PAYMENT_LABELS, PAYMENT_MAX_BYTES, type PaymentStatus } from "@/lib/participants";

interface PaymentProofProps {
  id: string;
  status: PaymentStatus;
  proofPath: string | null;
  ambassadorVerified: boolean;
  mode: "participant" | "ambassador";
}

const actionButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93C5FD]";
const button = `${actionButton} border-white/20 bg-white/5 text-white hover:bg-white/10`;

export function PaymentScreenshot({ id, hasProof }: { id: string; hasProof: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [preview, setPreview] = useState<"closed" | "open" | "failed">("closed");
  const endpoint = `/api/participants/registrations/${id}/payment`;
  if (!hasProof) return <span className="text-sm text-[#B3B3B3]">No screenshot uploaded</span>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" aria-haspopup="dialog" className={`${actionButton} border-[#93C5FD]/30 bg-[#93C5FD]/10 text-[#B9D8FF] hover:bg-[#93C5FD]/20`} onClick={() => {
        dialog.current?.showModal();
        setPreview("open");
      }}>
        <Eye size={16} aria-hidden="true" /> View screenshot
      </button>
      <a href={`${endpoint}?download=1`} download className={button}>
        <Download size={16} aria-hidden="true" /> Download screenshot
      </a>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => setPreview("closed")}
        className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-auto rounded-2xl border border-white/20 bg-[#141416] p-4 text-white backdrop:bg-black/75 sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">Payment screenshot</h2>
          <button type="button" onClick={() => dialog.current?.close()} className={button}>Close</button>
        </div>
        {preview === "open" && (
          // eslint-disable-next-line @next/next/no-img-element -- The private image must be requested with the viewer's cookies.
          <img src={endpoint} alt="Uploaded payment screenshot" onError={() => setPreview("failed")} className="mx-auto max-h-[65dvh] w-auto max-w-full object-contain" />
        )}
        {preview === "failed" && <p role="alert" className="text-sm text-[#FF8B96]">Couldn’t load the screenshot. Close and try again.</p>}
        <div className="mt-4 flex justify-end border-t border-white/15 pt-4">
          <a href={`${endpoint}?download=1`} download className={button}>
            <Download size={16} aria-hidden="true" /> Download screenshot
          </a>
        </div>
      </dialog>
    </div>
  );
}

export function PaymentProof({ id, status, proofPath, ambassadorVerified, mode }: PaymentProofProps) {
  const router = useRouter();
  const [action, setAction] = useState<"upload" | "remove" | "verify" | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const endpoint = `/api/participants/registrations/${id}/payment`;
  const busy = action !== null || refreshing;
  const canEdit = mode === "participant" && status === "pending";
  const canVerify = mode === "ambassador" && status === "pending" && proofPath && !ambassadorVerified;
  const screenshotUploaded = Boolean(proofPath);

  async function submitProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("proof");
    if (!(file instanceof File) || !PAYMENT_IMAGE_TYPES.includes(file.type) || !file.size || file.size > PAYMENT_MAX_BYTES) {
      setError("Choose a PNG, JPEG or WebP screenshot up to 3 MB.");
      return;
    }
    setAction("upload");
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.message ?? "Couldn't upload the screenshot. Try again.");
        return;
      }
      form.reset();
      setNotice("Screenshot uploaded. The event team can now review it.");
      startRefresh(() => router.refresh());
    } catch {
      setError("Couldn't upload the screenshot. Try again.");
    } finally {
      setAction(null);
    }
  }

  async function removeProof() {
    if (!proofPath || !window.confirm("Remove this screenshot? You can upload a different one afterward.")) return;
    setAction("remove");
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedProofPath: proofPath }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.message ?? "Couldn't remove the screenshot. Try again.");
        return;
      }
      setNotice("Screenshot removed. You can upload a different one.");
      startRefresh(() => router.refresh());
    } catch {
      setError("Couldn't remove the screenshot. Try again.");
    } finally {
      setAction(null);
    }
  }

  async function verifyProof() {
    setAction("verify");
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedProofPath: proofPath }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.message ?? "Couldn't verify the screenshot. Try again.");
        return;
      }
      startRefresh(() => router.refresh());
    } catch {
      setError("Couldn't verify the screenshot. Try again.");
    } finally {
      setAction(null);
    }
  }

  return (
    <section className="border-t border-white/15 pt-4" aria-label="Payment">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full border border-current/30 px-3 py-1 text-xs font-medium ${PAYMENT_COLORS[status]}`}>
          {PAYMENT_LABELS[status]}
        </span>
        {ambassadorVerified && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 px-3 py-1 text-xs font-medium text-sky-300">
            <Check size={14} aria-hidden="true" /> Verified by ambassador
          </span>
        )}
        <PaymentScreenshot id={id} hasProof={screenshotUploaded} />
        {canEdit && proofPath && (
          <button type="button" onClick={removeProof} disabled={busy} className={`${actionButton} border-rose-300/25 text-rose-300 hover:bg-rose-400/10`}>
            <Trash2 size={16} aria-hidden="true" /> {action === "remove" ? "Removing…" : "Remove screenshot"}
          </button>
        )}
        {canVerify && (
          <button type="button" onClick={verifyProof} disabled={busy} className={`${actionButton} border-sky-300/30 bg-sky-300/10 text-sky-200 hover:bg-sky-300/20`}>
            <Check size={16} aria-hidden="true" /> {action === "verify" ? "Verifying…" : "Verify payment as ambassador"}
          </button>
        )}
      </div>
      {canEdit && (
        <form method="post" action={endpoint} encType="multipart/form-data" onSubmit={submitProof} className="mt-4 grid gap-3 sm:max-w-md">
          <label className="grid gap-2 text-sm text-[#D4D4D4]">
            {screenshotUploaded ? "Replace payment screenshot" : "Upload payment screenshot"}
            <input type="file" name="proof" accept={PAYMENT_IMAGE_TYPES.join(",")} required disabled={busy}
              className="min-w-0 w-full rounded-lg border border-white/20 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" />
          </label>
          <p className="text-xs text-[#B3B3B3]">PNG, JPEG or WebP, up to 3 MB.</p>
          <button type="submit" className={`${button} justify-self-start`} disabled={busy}>{action === "upload" ? "Uploading…" : "Save screenshot"}</button>
        </form>
      )}
      {notice && <p role="status" className="mt-2 text-sm text-[#B9CCEB]">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-[#FF8B96]">{error}</p>}
    </section>
  );
}
