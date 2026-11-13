"use client";

import { useState } from "react";
import { PAYMENT_COLORS, PAYMENT_LABELS, PAYMENT_STATUSES, type PaymentStatus } from "@/lib/participants";

export function PaymentStatusSelect({ id, name, status, proofPath, onStatusChange }: {
  id: string;
  name: string;
  status: PaymentStatus;
  proofPath: string | null;
  onStatusChange: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updatePayment(nextStatus: PaymentStatus) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/participants/registrations/${id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, expectedProofPath: proofPath }),
      });
      const result = await response.json();
      if (response.ok) {
        onStatusChange();
      } else {
        setError(result.message ?? "Couldn't update payment status.");
      }
    } catch {
      setError("Couldn't update payment status. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <select
        aria-label={`Payment status for ${name}`}
        value={status}
        onChange={(event) => void updatePayment(event.target.value as PaymentStatus)}
        disabled={saving}
        className={`min-h-11 max-w-full rounded-lg border border-white/15 bg-[#0F0F0F] px-2 text-xs disabled:opacity-50 ${PAYMENT_COLORS[status]}`}
      >
        {PAYMENT_STATUSES.map((value) => <option key={value} value={value} className="text-white">{PAYMENT_LABELS[value]}</option>)}
      </select>
      {error && <p role="alert" className="mt-1 text-xs text-[#FF8B96]">{error}</p>}
    </>
  );
}
