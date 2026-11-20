import { Download } from "lucide-react";
import { BrandLogo } from "./brand-logo";

const packages = [
  { event: "HNC", logo: "hnc", href: "/packages/hnc-2026-liaison-package.pdf", size: "10.9 MB", accent: "text-sky-300" },
  { event: "UGX", logo: "ugx", href: "/packages/ugx-2026-liaison-package.pdf", size: "23.2 MB", accent: "text-rose-300" },
] as const;

export function LiaisonPackages() {
  return (
    <section aria-label="Liaison packages" className="mt-6">
      <h2 className="mb-3 font-heading text-lg font-semibold text-white">Liaison packages</h2>
      <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#101010]">
        {packages.map(({ event, logo, href, size, accent }) => (
          <li key={event}>
            <a
              href={href}
              download={`${event} 2026 Liaison Package.pdf`}
              aria-label={`Download ${event} 2026 liaison package (PDF, ${size})`}
              className="flex min-h-20 items-center gap-4 p-4 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-300"
            >
              <BrandLogo name={logo} className="w-14" />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-medium ${accent}`}>{event} &apos;26 liaison package</span>
                <span className="mt-1 block text-xs text-[#B3B3B3]">PDF · {size}</span>
              </span>
              <Download size={18} aria-hidden="true" className={`shrink-0 ${accent}`} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
