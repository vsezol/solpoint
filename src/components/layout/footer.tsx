"use client";

import Image from "next/image";
import Link from "next/link";
import { Twitter } from "lucide-react";

const footerLinks = {
  explore: [
    { href: "/map", label: "Map" },
    { href: "/events", label: "Events" },
    { href: "/hubs", label: "Hubs" },
    { href: "/subscription", label: "Subscription" },
  ],
};

const socialLinks = [
  { href: "https://twitter.com/solpoint", icon: Twitter, label: "Twitter" },
  { href: "https://twitter.com/solpoint", icon: Twitter, label: "Twitter 2" },
  { href: "https://twitter.com/solpoint", icon: Twitter, label: "Twitter 3" },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-surface-border)] bg-[var(--color-surface)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 relative">
                <Image
                  src="/logo.svg"
                  alt="SolPoint"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-lg font-semibold text-[var(--color-primary)]">
                Sol Point
              </span>
            </Link>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">
              The fastest way to forge productive, permanent connections in the
              Solana ecosystem.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-border)] transition-colors"
                >
                  <link.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Supported by */}
          <div className="flex flex-col items-center justify-center">
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
              Supported by Superteam KZ
            </p>
          </div>

          {/* Links */}
          <div className="md:text-right">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">
              Explore more:
            </h3>
            <ul className="space-y-2">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-[var(--color-surface-border)] text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Copyright ©{new Date().getFullYear()} SolPoint. All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}

