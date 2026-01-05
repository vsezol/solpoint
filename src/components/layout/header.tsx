"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, LogOut, User, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/events", label: "Events" },
  { href: "/hubs", label: "Hubs" },
  { href: "/subscription", label: "Subscription" },
  { href: "/about", label: "About us" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Формируем динамический список ссылок навигации
  const dynamicNavLinks = [...navLinks];
  
  // Собираем дополнительные ссылки (Dashboard и Admin)
  const additionalLinks = [];
  if (user?.enable_dashboard) {
    additionalLinks.push({ href: "/dashboard", label: "Dashboard" });
  }
  if (user?.is_admin) {
    additionalLinks.push({ href: "/admin", label: "Admin" });
  }
  
  // Вставляем дополнительные ссылки перед "About us"
  if (additionalLinks.length > 0) {
    const aboutIndex = dynamicNavLinks.findIndex(link => link.href === "/about");
    if (aboutIndex !== -1) {
      dynamicNavLinks.splice(aboutIndex, 0, ...additionalLinks);
    }
  }

  // Закрываем поп-ап при клике вне его
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
    <header className="fixed top-0 left-0 right-0 z-[1000] glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 relative">
              <Image
                src="/logo.svg"
                alt="SolPoint"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-lg font-semibold text-[var(--color-primary)]">
              Sol Point
            </span>
          </Link>

          {/* Desktop Navigation and Auth Buttons - Right Side */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Desktop Navigation */}
            <nav className="flex items-center gap-1">
              {dynamicNavLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => {
                      trackEvent("navigation_click", {
                        event_category: "Navigation",
                        event_label: link.label,
                        destination: link.href,
                      });
                    }}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <span className="block h-0.5 mt-0.5 bg-[var(--color-primary)] rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3 ml-3">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface-border)] animate-pulse" />
                <div className="w-20 h-4 bg-[var(--color-surface-border)] rounded animate-pulse" />
              </div>
            ) : isAuthenticated && user ? (
              <div className="relative" ref={profileMenuRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--color-surface-border)]">
                    {user.avatar_url && (
                      <Image
                        src={user.avatar_url}
                        alt={user.twitter_handle}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    )}
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    @{user.twitter_handle}
                  </span>
                </Button>
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg shadow-lg overflow-hidden z-[1001]"
                    >
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            router.push(`/profile/${user.twitter_handle}`);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </button>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            router.push("/chats");
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Chats
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-[var(--color-surface-border)] bg-[var(--color-surface)]"
          >
            <nav className="px-4 py-4 space-y-1">
              {dynamicNavLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      trackEvent("navigation_click", {
                        event_category: "Navigation",
                        event_label: link.label,
                        destination: link.href,
                        is_mobile: true,
                      });
                    }}
                    className={cn(
                      "block px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="pt-4 space-y-2">
                {isLoading ? (
                  <div className="px-4 py-2">
                    <div className="h-4 bg-[var(--color-surface-border)] rounded animate-pulse" />
                  </div>
                ) : isAuthenticated && user ? (
                  <Link
                    href={`/profile/${user.twitter_handle}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                  >
                    Profile
                  </Link>
                ) : (
                  <>
                    <Button variant="outline" size="md" className="w-full" asChild>
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button variant="secondary" size="md" className="w-full" asChild>
                      <Link href="/signup">Sign up</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

