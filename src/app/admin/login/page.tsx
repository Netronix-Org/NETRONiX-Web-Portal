import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";
import { BrandLogo } from "@/components/ui/brand-logo";

export const metadata: Metadata = {
  title: "Admin Login — NETRONiX",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <BrandLogo name="netronix" className="mx-auto mb-3 w-40" />
          <h1
            className="font-heading font-semibold"
            style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", letterSpacing: "-0.03em" }}
          >
            Admin Portal
          </h1>
          <p className="text-sm" style={{ color: "#666666" }}>
            Sign in to manage events and submissions.
          </p>
        </div>

        {/* LoginForm reads ?next= via useSearchParams, which needs a boundary. */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
