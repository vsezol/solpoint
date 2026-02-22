"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Calendar, Building2, Sparkles, User, Menu } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";

const navItems = [
  { href: "/map", label: "Map", icon: Map },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/hubs", label: "Hubs", icon: Building2 },
  { href: "/token2049", label: "Token2049", icon: Sparkles, highlight: true },
];

const moreLinks = [
  { href: "/", label: "Home" },
  { href: "/subscription", label: "PRO" },
  { href: "/about", label: "About" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const profileHref = isAuthenticated && user
    ? `/profile/${user.twitter_handle}`
    : "/login";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[998] md:hidden"
              onClick={() => setIsMoreOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] left-4 right-4 z-[999] md:hidden"
            >
              <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-surface-border)] rounded-2xl overflow-hidden shadow-2xl">
                {moreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => {
                      setIsMoreOpen(false);
                      trackEvent("navigation_click", {
                        event_category: "Navigation",
                        event_label: link.label,
                        destination: link.href,
                        is_mobile: true,
                      });
                    }}
                    className={cn(
                      "block px-5 py-3.5 text-sm font-medium transition-colors border-b border-[var(--color-surface-border)] last:border-b-0",
                      isActive(link.href)
                        ? "text-[var(--color-primary)] bg-[var(--color-primary)]/5"
                        : "text-[var(--color-text-secondary)] active:bg-[var(--color-surface-hover)]"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[997] md:hidden">
        <div className="bg-[var(--color-surface)]/95 backdrop-blur-xl border-t border-[var(--color-surface-border)]">
          <div
            className="flex items-center justify-around px-2"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            {navItems.map((item) => {
              const active = isActive(item.href);
              const isHighlight = "highlight" in item && item.highlight;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    trackEvent("navigation_click", {
                      event_category: "Navigation",
                      event_label: item.label,
                      destination: item.href,
                      is_mobile: true,
                    });
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[3.5rem] relative transition-colors",
                    active
                      ? "text-[var(--color-primary)]"
                      : isHighlight
                        ? "text-[var(--color-secondary)]"
                        : "text-[var(--color-text-muted)] active:text-[var(--color-text-secondary)]"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className={cn(
                        "absolute -top-px left-2 right-2 h-[2px] rounded-full",
                        isHighlight ? "bg-[var(--color-secondary)]" : "bg-[var(--color-primary)]"
                      )}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
                  <span className={cn(
                    "text-[10px] font-medium leading-none",
                    isHighlight && !active && "text-[var(--color-secondary)]"
                  )}>{item.label}</span>
                </Link>
              );
            })}

            {/* Profile tab */}
            <Link
              href={profileHref}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[3.5rem] relative transition-colors",
                isActive("/profile") || isActive("/login")
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] active:text-[var(--color-text-secondary)]"
              )}
            >
              {(isActive("/profile") || isActive("/login")) && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute -top-px left-2 right-2 h-[2px] bg-[var(--color-primary)] rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <User className="w-5 h-5" strokeWidth={(isActive("/profile") || isActive("/login")) ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium leading-none">
                {isAuthenticated ? "Profile" : "Log in"}
              </span>
            </Link>

            {/* More tab */}
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[3.5rem] relative transition-colors",
                isMoreOpen
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] active:text-[var(--color-text-secondary)]"
              )}
            >
              <Menu className="w-5 h-5" strokeWidth={isMoreOpen ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
