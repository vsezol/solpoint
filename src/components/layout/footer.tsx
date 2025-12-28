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
    <footer className="relative bg-[#1a1f26]">
      {/* Gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#4a1d5c] via-[#2d4a3a] to-[#1a4a2d]" />
      
      <div className="w-full py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-12">
          {/* Left Column - Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 relative flex-shrink-0">
                <Image
                  src="/logo.svg"
                  alt="SolPoint"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-lg font-semibold">
                <span className="text-white">Sol</span>{" "}
                <span className="text-[var(--color-primary)]">Point</span>
              </span>
            </Link>
            <p className="text-sm text-white max-w-xs">
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
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[#2a2f36] text-white hover:bg-[#3a3f46] transition-colors"
                  aria-label={link.label}
                >
                  <link.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Middle Column - Supported by & Copyright */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <p className="text-sm text-white">
              Supported by Superteam KZ
            </p>
            <p className="text-sm text-[#9ca3af]">
              Copyright ©{new Date().getFullYear()} SolPoint. All rights reserved
            </p>
          </div>

          {/* Right Column - Links */}
          <div className="flex-shrink-0">
            <h3 className="text-sm font-semibold text-white mb-4">
              Explore more:
            </h3>
            <ul className="space-y-2">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white hover:text-[var(--color-primary)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

