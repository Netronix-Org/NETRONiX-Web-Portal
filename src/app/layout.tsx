import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { SmoothScroll } from "@/components/ui/smooth-scroll";
import "./globals.css";

// ─── Fonts ────────────────────────────────────────────────────────────────────

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  display: "swap",
  preload: false, // non-critical
});

const clashGrotesk = localFont({
  src: "./fonts/ClashGrotesk-Bold.woff2",
  variable: "--font-clash-grotesk",
  weight: "700",
  display: "swap",
});

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: "NETRONiX — Powering GIKI's Digital Infrastructure",
    template: "%s | NETRONiX",
  },
  description:
    "NETRONiX is the official network and events society of Ghulam Ishaq Khan Institute. Maintaining one of Pakistan's largest student-managed campus networks while creating unforgettable technical and gaming experiences.",
  keywords: [
    "NETRONiX",
    "GIKI",
    "Ghulam Ishaq Khan Institute",
    "network society",
    "UGX",
    "Hack n Connect",
    "campus network",
    "Pakistan university",
  ],
  authors: [{ name: "NETRONiX", url: "https://netronix.giki.edu.pk" }],
  creator: "NETRONiX",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "NETRONiX — Powering GIKI's Digital Infrastructure",
    description:
      "The digital backbone of Ghulam Ishaq Khan Institute. Premium network infrastructure and unforgettable technical events.",
    siteName: "NETRONiX",
  },
  twitter: {
    card: "summary_large_image",
    title: "NETRONiX — Powering GIKI's Digital Infrastructure",
    description: "The digital backbone of GIKI.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ─── Root Layout ─────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="en"
        className={`dark h-full antialiased ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${clashGrotesk.variable}`}
      >
      <body
        className="min-h-full overflow-x-hidden"
        style={{
          fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
          backgroundColor: "#050505",
          color: "#FFFFFF",
        }}
      >
        {/* Skip to main content — WCAG 2.4.1 — visible only on keyboard focus */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {/* Lenis smooth scroll outside the portals */}
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
