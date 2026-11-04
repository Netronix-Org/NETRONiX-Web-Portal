"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/ui/password-input";

const inputClass = "min-h-12 w-full rounded-lg border border-white/25 bg-[#080808] px-4 text-base text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93C5FD]";

export function EventPortalLogin({ portal }: { portal: "ambassadors" | "participants" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const endpoint = `/api/${portal}/session`;

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const intent = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ?? "login";
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, email: data.get("email"), password: data.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.message ?? "Couldn't sign in. Please try again.");
        return;
      }
      if (intent === "email-password") setNotice(result.message);
      else router.refresh();
    } catch {
      setError("Couldn't connect. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form method="post" action={endpoint} onSubmit={signIn} className="rounded-2xl border border-white/15 bg-[#141416] p-6 sm:p-8" aria-labelledby="portal-sign-in">
      <h2 id="portal-sign-in" className="font-heading text-2xl font-semibold">Sign in</h2>
      <fieldset disabled={pending} className="mt-6 grid gap-5">
        <legend className="sr-only">Portal credentials</legend>
        <label className="grid gap-2 text-sm">
          Email
          <input name="email" type="email" autoComplete="username" maxLength={150} required className={inputClass} />
        </label>
        <div className="grid gap-2 text-sm">
          <label htmlFor="portal-password">Password</label>
          <PasswordInput id="portal-password" name="password" autoComplete="current-password" minLength={8} maxLength={8} required className={inputClass} />
        </div>
        {error && <p role="alert" className="text-sm text-[#FF8B96]">{error}</p>}
        {notice && <p role="status" className="text-sm text-[#B9CCEB]">{notice}</p>}
        <button type="submit" className="min-h-12 rounded-full bg-white px-5 text-sm font-semibold text-[#101010] hover:bg-[#DCE9FC] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93C5FD]">
          {pending ? "Signing in…" : "Sign in"}
        </button>
        {portal === "participants" && (
          <button type="submit" value="email-password" formNoValidate className="min-h-10 text-sm font-medium text-[#93C5FD] underline underline-offset-4">
            Email me my password
          </button>
        )}
      </fieldset>
    </form>
  );
}

export function EventPortalSignOut({ portal }: { portal: "ambassadors" | "participants" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/${portal}/session`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Couldn't sign out. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={signOut} disabled={pending} className="min-h-11 rounded-full border border-white/20 px-4 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93C5FD]">
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-[#FF8B96]">{error}</p>}
    </div>
  );
}
