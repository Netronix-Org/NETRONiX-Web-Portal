import Image from "next/image";

// Visible alpha bounds of the supplied 1920 × 1080 originals. Only transparent
// canvas padding is hidden; the source marks are preserved without alteration.
const LOGOS = {
  netronix: { src: "/brand/netronix-white.png", alt: "NETRONiX", x: 223, y: 434, width: 1475, height: 215 },
  hnc: { src: "/brand/hnc.png", alt: "HNC — Hack n' Connect", x: 425, y: 319, width: 1070, height: 442 },
  ugx: { src: "/brand/ugx.png", alt: "UGX — Uber.Game X", x: 402, y: 256, width: 1116, height: 568 },
} as const;

export function BrandLogo({ name, className = "" }: { name: keyof typeof LOGOS; className?: string }) {
  const logo = LOGOS[name];
  return (
    <span className={`relative block shrink-0 overflow-hidden ${className}`} style={{ aspectRatio: `${logo.width} / ${logo.height}` }}>
      <Image
        src={logo.src}
        alt={logo.alt}
        width={1920}
        height={1080}
        unoptimized
        className="absolute max-w-none"
        style={{
          width: `${1920 / logo.width * 100}%`,
          height: "auto",
          left: `${-logo.x / logo.width * 100}%`,
          top: `${-logo.y / logo.height * 100}%`,
        }}
      />
    </span>
  );
}
