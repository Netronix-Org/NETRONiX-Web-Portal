"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyValueButton({ value, label }: { value: string; label: string }) {
  const [status, setStatus] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Copied");
    } catch {
      setStatus("Copy unavailable. Select the text to copy it.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3">
      <button type="button" onClick={copy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-3 text-sm text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93C5FD]">
        {status === "Copied" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
        Copy {label}
      </button>
      <span role="status" className="text-xs text-[#B9CCEB]">{status}</span>
    </div>
  );
}
