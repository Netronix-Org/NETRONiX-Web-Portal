"use client";

import { useState } from "react";
import { CopyValueButton } from "@/components/ui/copy-value-button";

export function RegistrationPassword({ endpoint, issued = true, method = "GET" }: {
  endpoint: string;
  issued?: boolean;
  method?: "GET" | "POST";
}) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function reveal() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(endpoint, { method, cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setPassword(data.password);
    } catch {
      setError("Couldn't load the password. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (!issued) return <span className="text-[#B3B3B3]">Pending</span>;

  return (
    <div className="min-w-36">
      {password && <code className="block py-1 text-white">{password}</code>}
      {password ? (
        <>
          <CopyValueButton value={password} label="password" />
          <button type="button" className="min-h-10 text-sm text-[#93C5FD] underline" onClick={() => setPassword("")}>Hide password</button>
        </>
      ) : (
        <button type="button" disabled={pending} onClick={reveal} className="min-h-10 text-sm text-[#93C5FD] underline">
          {pending ? "Loading…" : "Reveal password"}
        </button>
      )}
      {error && <p role="alert" className="text-xs text-[#FF8B96]">{error}</p>}
    </div>
  );
}
