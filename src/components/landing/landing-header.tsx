"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { href: "/events", label: "Events" },
  { href: "/map", label: "Map" },
];

const kodeMonoStyle = {
  fontFamily: "var(--font-kode-mono), monospace",
};

export function LandingHeader() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const profileHref =
    isAuthenticated && user?.id
      ? `/profile/${user.id}`
      : "/profile";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await logout();
  };

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
          ) : !isAuthenticated ? (
            <Link
              href="/login"
              aria-label="Profile"
              className="group flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#2f2f2f] bg-[#0f0f0f] transition-transform duration-200 ease-out hover:scale-105"
            >
              <User className="h-5 w-5 text-white/85 transition-colors duration-200 group-hover:text-white" />
            </Link>
          ) : (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                aria-label="Profile menu"
                onClick={() => setIsProfileMenuOpen((current) => !current)}
                className="group flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#2f2f2f] bg-[#0f0f0f] transition-transform duration-200 ease-out hover:scale-105"
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
                  <User className="h-5 w-5 text-white/85 transition-colors duration-200 group-hover:text-white" />
                )}
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-lg border border-[#2f2f2f] bg-[#0f0f0f] shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                  <div className="py-1">
                    <Link
                      href={profileHref}
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white/95 transition-colors hover:bg-white/10"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white/95 transition-colors hover:bg-white/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
