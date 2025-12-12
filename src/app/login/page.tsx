"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { Header, Footer } from "@/components/layout";
import { Twitter } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleTwitterLogin = async () => {
    setIsLoading(true);
    // TODO: Implement Twitter OAuth
    // For now, redirect to signup flow
    window.location.href = "/api/auth/twitter";
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

