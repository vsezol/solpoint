"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Badge } from "@/components/ui";
import { Header, Footer } from "@/components/layout";
import { Twitter, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { trackEvent } from "@/lib/analytics";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleTwitterLogin = async () => {
    try {
      setIsLoading(true);
      trackEvent("login_start", {
        event_category: "Authentication",
        method: "twitter",
      });
      // Редиректим на API route для инициации Twitter OAuth
      window.location.href = "/api/auth/twitter";
    } catch (error) {
      setIsLoading(false);
      trackEvent("login_error", {
        event_category: "Authentication",
        error_type: error instanceof Error ? error.message : "unknown",
      });
      alert("Не удалось начать вход. Пожалуйста, попробуйте еще раз.");
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 flex items-center justify-center animated-bg px-4">
        {/* Background effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-secondary)]/10 rounded-full blur-3xl" />

        <Card variant="bordered" className="w-full max-w-md p-8 relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.svg"
              alt="SolPoint"
              width={60}
              height={60}
            />
          </div>

          <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-2">
            Welcome Back
          </h1>
          <p className="text-center text-[var(--color-text-secondary)] mb-8">
            Sign in to access your SolPoint account
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-2 text-red-500">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  {(() => {
                    trackEvent("login_error", {
                      event_category: "Authentication",
                      error_type: error,
                    });
                    return null;
                  })()}
                  <p className="text-sm font-medium mb-1">
                    {error === "twitter_not_enabled"
                      ? "Twitter OAuth не настроен"
                      : error === "oauth_failed"
                      ? "Ошибка подключения к Twitter"
                      : "Ошибка авторизации"}
                  </p>
                  {error === "twitter_not_enabled" && (
                    <div className="text-xs text-red-400 mt-2 space-y-1">
                      <p>Необходимо включить Twitter OAuth в Supabase:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Откройте Supabase Dashboard</li>
                        <li>Перейдите в Authentication → Providers</li>
                        <li>Включите Twitter и введите API Key и Secret</li>
                      </ol>
                      <p className="mt-2">
                        Подробная инструкция: <code className="text-xs bg-red-500/20 px-1 rounded">/notes/twitter-oauth-setup.md</code>
                      </p>
                    </div>
                  )}
                  {error !== "twitter_not_enabled" && (
                    <p className="text-xs text-red-400 mt-1">
                      {decodeURIComponent(error)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Twitter Login */}
          <Button
            onClick={handleTwitterLogin}
            isLoading={isLoading}
            className="w-full mb-4 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white"
            size="lg"
          >
            <Twitter className="w-5 h-5 mr-2" />
            Continue with Twitter
          </Button>

          <p className="text-xs text-center text-[var(--color-text-muted)] mb-6">
            We&apos;ll use your Twitter profile to create your SolPoint account.
            We don&apos;t post anything without your permission.
          </p>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[var(--color-surface-border)]" />
            <span className="text-sm text-[var(--color-text-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--color-surface-border)]" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-[var(--color-text-secondary)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-[var(--color-primary)] hover:underline"
            >
              Sign up
            </Link>
          </p>
        </Card>
      </main>
      <Footer />
    </>
  );
}

