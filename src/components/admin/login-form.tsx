"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/ui/password-input";

const FIELD =
  "w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors " +
  "placeholder:text-[#555555] focus:border-[rgba(225,29,46,0.6)]";

const FIELD_STYLE = {
  backgroundColor: "#0F0F0F",
  borderColor: "rgba(255,255,255,0.1)",
  color: "#FFFFFF",
} as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Only accept same-site paths, so ?next= cannot bounce someone off-site.
  const rawNext = searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/admin/portal";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.message ?? "Incorrect username or password");
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border p-6 flex flex-col gap-5"
      style={{ backgroundColor: "#141414", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor="username"
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: "#B3B3B3", letterSpacing: "0.12em" }}
        >
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={FIELD}
          style={FIELD_STYLE}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: "#B3B3B3", letterSpacing: "0.12em" }}
        >
          Password
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={FIELD}
          style={FIELD_STYLE}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm rounded-lg border px-4 py-3"
          style={{
            color: "#E11D2E",
            borderColor: "rgba(225,29,46,0.4)",
            backgroundColor: "rgba(225,29,46,0.08)",
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3 px-6 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: "rgba(225,29,46,0.12)",
          borderColor: "rgba(225,29,46,0.5)",
          color: "#FFFFFF",
        }}
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
