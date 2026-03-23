"use client";

import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { href: "/events", label: "Events" },
  { href: "/map", label: "Map" },
];

const kodeMonoStyle = {
  fontFamily: "var(--font-kode-mono), monospace",
};

export function LandingHeader() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const profileHref =
    isAuthenticated && user?.twitter_handle
      ? `/profile/${user.twitter_handle}`
      : "/login";

  return (
    <header className="fixed top-0 left-0 right-0 z-[1200] border-b border-[#2a2a2a] bg-black/95 backdrop-blur">
      <div className="mx-auto flex h-[74px] w-full max-w-[1440px] items-center px-4 md:px-10">
        <div className="flex flex-1 items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative h-[60px] w-[60px]">
              <Image src="/main-logo.svg" alt="SolPoint" fill className="object-contain" priority />
            </div>
          <span className="hidden sm:inline text-xl font-semibold text-white md:text-[25px]" style={kodeMonoStyle}>
            SolPoint
          </span>
          </Link>
        </div>

        <nav className="flex items-center justify-center gap-7 md:gap-14">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-base font-bold tracking-[-0.03em] text-white/95 transition-colors hover:text-white md:text-[25px]"
              style={kodeMonoStyle}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 justify-end">
          {isLoading ? (
            <div
              className="h-11 w-11 shrink-0 rounded-full border border-[#2f2f2f] bg-[#1a1a1a] animate-pulse"
              aria-hidden
            />
          ) : (
            <Link
              href={profileHref}
              aria-label="Profile"
              className="group flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#2f2f2f] bg-[#0f0f0f] transition-colors"
            >
              {user?.avatar_url ? (
                <div className="relative h-full w-full">
                  <Image
                    src={user.avatar_url}
                    alt={user.twitter_handle || "Profile"}
                    fill
                    className="object-cover"
                    sizes="44px"
                  />
                </div>
              ) : (
                <User className="h-5 w-5 text-white/85 transition-colors group-hover:text-white" />
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
