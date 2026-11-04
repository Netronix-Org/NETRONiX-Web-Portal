"use client";

import { useState } from "react";

export function PaymentStatusSelect({ id, name, paid, proofPath, onPaidChange }: {
  id: string;
  name: string;
  paid: boolean;
  proofPath: string | null;
  onPaidChange: (paid: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updatePayment(nextPaid: boolean) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/participants/registrations/${id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: nextPaid, expectedProofPath: proofPath }),
      });
      const result = await response.json();
      if (response.ok) {
        onPaidChange(result.paid);
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
        value={paid ? "paid" : "pending"}
        onChange={(event) => void updatePayment(event.target.value === "paid")}
        disabled={saving}
        className={`min-h-11 max-w-full rounded-lg border border-white/15 bg-[#0F0F0F] px-2 text-xs disabled:opacity-50 ${paid ? "text-green-300" : "text-amber-200"}`}
      >
        <option value="pending" className="text-white">Payment pending</option>
        <option value="paid" className="text-white">Paid</option>
      </select>
      {error && <p role="alert" className="mt-1 text-xs text-[#FF8B96]">{error}</p>}
    </>
  );
}
