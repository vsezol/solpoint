"use client";

import Image from "next/image";
import Link from "next/link";
import { Twitter } from "lucide-react";

const footerLinks = [
  { href: "/map", label: "Map" },
  { href: "/events", label: "Events" },
  { href: "/hubs", label: "Hubs" },
  { href: "/subscription", label: "Subscription" },
  { href: "/about", label: "About" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-[var(--color-surface-border)] bg-[var(--color-background)] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col gap-8">
          {/* Top row: logo + links */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 relative flex-shrink-0">
                <Image
                  src="/logo.svg"
                  alt="SolPoint"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-base font-semibold text-[var(--color-text-primary)]">
                SolPoint
              </span>
            </Link>

            <nav className="flex flex-wrap items-center gap-6">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Divider */}
          <div className="h-px bg-[var(--color-surface-border)]" />

          {/* Bottom row: copyright + social */}
          <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[var(--color-text-muted)]">
              &copy; {new Date().getFullYear()} SolPoint. All rights reserved.
            </p>

            <div className="flex items-center gap-4">
              <a
                href="https://twitter.com/solpointxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
