/**
 * Shared visual language for form fields across the public registration
 * forms and the admin scoring form. Single source of truth for the color
 * tokens and label/error markup so a future style tweak doesn't need to be
 * hand-applied in every form that uses it.
 */

export const FIELD_STYLE = {
  backgroundColor: "#0F0F0F",
  borderColor: "rgba(255,255,255,0.1)",
  color: "#FFFFFF",
} as const;

/** Default field sizing, used by the full-page public registration forms. */
export const FIELD_BASE =
  "w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors " +
  "placeholder:text-[#555555] focus:border-[rgba(225,29,46,0.6)]";

/** Denser sizing for fields embedded inside an admin table row. */
export const FIELD_BASE_COMPACT =
  "w-full rounded-lg border px-2.5 py-2 text-sm outline-none transition-colors " +
  "focus:border-[rgba(225,29,46,0.6)]";

export function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="font-mono text-xs uppercase tracking-widest"
        style={{ color: "#B3B3B3", letterSpacing: "0.12em" }}
      >
        {children}
      </label>
      {hint && (
        <span className="text-xs" style={{ color: "#666666" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs" style={{ color: "#E11D2E" }}>
      {message}
    </p>
  );
}
