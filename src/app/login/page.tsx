"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Header, Footer } from "@/components/layout";
import { Twitter, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { trackEvent } from "@/lib/analytics";

const kodeMonoStyle = {
  fontFamily: "var(--font-kode-mono), monospace",
} as const;

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const redirectTo = searchParams.get("redirect_to");

  const handleTwitterLogin = async () => {
    try {
      setIsLoading(true);
      trackEvent("login_start", {
        event_category: "Authentication",
        method: "twitter",
      });
      // Редиректим на API route для инициации Twitter OAuth
      const loginUrl = redirectTo
        ? `/api/auth/twitter?redirect_to=${encodeURIComponent(redirectTo)}`
        : "/api/auth/twitter";
      window.location.href = loginUrl;
    } catch (error) {
      setIsLoading(false);
      trackEvent("login_error", {
        event_category: "Authentication",
        error_type: error instanceof Error ? error.message : "unknown",
      });
      alert("Failed to start login. Please try again.");
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-16 pt-[90px]" style={kodeMonoStyle}>
        <section className="mx-auto w-full max-w-[1440px] px-4 md:px-10">
          <div className="mx-auto w-full max-w-[520px] border border-[#2A2A2A] bg-[#101319] px-5 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8">
            <div className="mb-7 flex items-center justify-center gap-3">
              <div className="relative h-[58px] w-[58px] shrink-0">
                <Image src="/main-logo.svg" alt="SolPoint" fill className="object-contain" priority />
              </div>
              <span className="text-[28px] font-bold leading-none text-white">SolPoint</span>
            </div>

            <h1 className="text-center text-[30px] font-bold leading-none text-white">
              Welcome back
            </h1>
            <p className="mx-auto mt-3 max-w-[420px] text-center text-[15px] font-medium leading-snug text-white/70">
              Sign in to continue to your profile, events, and map connections.
            </p>

            {error && (
              <div className="mt-6 border border-red-500/40 bg-red-500/10 px-4 py-3">
                <div className="flex items-start gap-2 text-red-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    {(() => {
                      trackEvent("login_error", {
                        event_category: "Authentication",
                        error_type: error,
                      });
                      return null;
                    })()}
                    <p className="text-[13px] font-semibold leading-snug text-red-100">
                      {error === "twitter_not_enabled"
                        ? "Twitter OAuth is not configured"
                        : error === "oauth_failed"
                        ? "Failed to connect to Twitter"
                        : "Authorization error"}
                    </p>
                    {error === "twitter_not_enabled" ? (
                      <div className="mt-2 space-y-1 text-[12px] text-red-200/90">
                        <p>You need to enable Twitter OAuth in Supabase:</p>
                        <ol className="ml-2 list-inside list-decimal space-y-0.5">
                          <li>Open Supabase Dashboard</li>
                          <li>Go to Authentication → Providers</li>
                          <li>Enable Twitter and enter API Key and Secret</li>
                        </ol>
                        <p className="mt-1">
                          Подробная инструкция:{" "}
                          <code className="rounded bg-red-500/20 px-1 py-0.5 text-[11px]">
                            /notes/twitter-oauth-setup.md
                          </code>
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-[12px] text-red-200/90">{decodeURIComponent(error)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleTwitterLogin}
              isLoading={isLoading}
              size="lg"
              className="mt-6 h-[49px] w-full rounded-[7px] border border-white bg-white px-4 text-[18px] font-bold leading-none tracking-[-0.03em] text-black hover:bg-white/90"
              style={kodeMonoStyle}
            >
              <Twitter className="mr-2 h-5 w-5" />
              Continue with Twitter
            </Button>

            <p className="mt-4 text-center text-[12px] font-medium leading-snug text-white/60">
              We&apos;ll use your Twitter profile to create your SolPoint account.
              We don&apos;t post anything without your permission.
            </p>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/15" />
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">
                or
              </span>
              <div className="h-px flex-1 bg-white/15" />
            </div>

            <Link
              href={
                redirectTo
                  ? `/signup?redirect_to=${encodeURIComponent(redirectTo)}`
                  : "/signup"
              }
              className="group inline-flex h-[49px] w-full items-stretch rounded-[7px] p-px"
              style={{ background: "linear-gradient(90deg, #9b45fe 0%, #00f58d 100%)" }}
            >
              <span className="flex flex-1 items-center justify-center rounded-[6px] bg-black px-4 text-[18px] font-bold leading-none tracking-[-0.03em] text-white transition-colors group-hover:bg-transparent group-hover:text-black">
                Create account
              </span>
            </Link>

            <p className="mt-5 text-center text-[13px] font-medium text-white/70">
              Already registered and seeing this page?{" "}
              <Link
                href={
                  redirectTo
                    ? `/login?redirect_to=${encodeURIComponent(redirectTo)}`
                    : "/login"
                }
                className="text-white underline underline-offset-2 hover:text-white/80"
              >
                Refresh sign-in
              </Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <main className="min-h-screen bg-black pt-[90px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#14f195]" />
          </div>
        </main>
        <Footer />
      </>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
