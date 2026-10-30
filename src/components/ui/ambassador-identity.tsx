import { BrandLogo } from "./brand-logo";

/** Official event marks, supplied by NETRONiX. */
export function AmbassadorIdentity() {
  return (
    <div className="flex items-center gap-5 sm:gap-10">
      <BrandLogo name="hnc" className="w-32 sm:w-44" />
      <span className="h-12 w-px bg-white/15" aria-hidden="true" />
      <BrandLogo name="ugx" className="w-24 sm:w-36" />
    </div>
  );
}
