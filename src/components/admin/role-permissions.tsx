"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_PERMISSIONS, CONFIGURABLE_ROLES, PERMISSION_KEYS, ROLE_LABELS, type AdminPermission, type AdminPermissions } from "@/lib/admin-permissions";

export type EditableRolePermissions = Record<typeof CONFIGURABLE_ROLES[number], AdminPermissions>;

export function RolePermissions({ initial }: { initial: EditableRolePermissions }) {
  const router = useRouter();
  const [permissions, setPermissions] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);

  async function change(role: keyof EditableRolePermissions, permission: AdminPermission, enabled: boolean) {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permission, enabled }),
      });
      if (!response.ok) throw new Error();
      setPermissions((current) => ({ ...current, [role]: { ...current[role], [permission]: enabled } }));
      setFeedback({ error: false, text: `${ADMIN_PERMISSIONS[permission]} ${enabled ? "enabled" : "disabled"} for ${ROLE_LABELS[role]}.` });
      router.refresh();
    } catch {
      setFeedback({ error: true, text: "Couldn’t save this permission. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="role-permissions-heading" className="rounded-xl border border-white/10 bg-[#141414] p-4 sm:p-6">
      <h2 id="role-permissions-heading" className="font-heading text-xl font-semibold">Role permissions</h2>
      <p className="mt-2 text-sm text-neutral-400">Changes apply to everyone with that role. Executive admins have full access.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {CONFIGURABLE_ROLES.map((role) => (
          <fieldset key={role} disabled={saving} className="min-w-0 rounded-lg border border-white/15 px-3 pb-2 sm:px-4">
            <legend className="px-1 text-sm font-medium text-white">{ROLE_LABELS[role]}</legend>
            {PERMISSION_KEYS.map((permission) => (
              <label key={permission} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-1 text-sm text-neutral-200">
                {ADMIN_PERMISSIONS[permission]}
                <input
                  type="checkbox"
                  aria-label={`${ROLE_LABELS[role]}: ${ADMIN_PERMISSIONS[permission]}`}
                  checked={permissions[role][permission]}
                  onChange={(event) => void change(role, permission, event.target.checked)}
                  className="h-5 w-5 shrink-0 accent-red-500 disabled:opacity-50"
                />
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      {feedback && <p role={feedback.error ? "alert" : "status"} className={`mt-3 text-sm ${feedback.error ? "text-red-300" : "text-neutral-300"}`}>{feedback.text}</p>}
    </section>
  );
}
