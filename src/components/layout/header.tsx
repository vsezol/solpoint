"use client";

import { cn } from "@/lib/utils";
import { Button, ProSubscriptionModal } from "@/components/ui";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, LogOut, User, MessageSquare, CalendarClock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { getMeetingRequestCounts } from "@/lib/api/meeting-requests";
import { isMeetingRequestsEnabled } from "@/lib/meeting-requests";
import { LandingHeader } from "@/components/landing/landing-header";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  // { href: "/token2049", label: "Token2049" },
  { href: "/events", label: "Events" },
  { href: "/hubs", label: "Hubs" },
  { href: "/subscription", label: "Subscription" },
  { href: "/about", label: "About us" },
];

function LegacyHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [hasEntities, setHasEntities] = useState<boolean | null>(null);
  const [meetingActionNeededCount, setMeetingActionNeededCount] = useState(0);
  const [showMeetingRequestsProModal, setShowMeetingRequestsProModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const meetingRequestsEnabled = isMeetingRequestsEnabled();
  const userId = user?.id;
  const isVipUser = user?.subscription_tier === "vip";

  // Проверяем наличие сущностей для показа Dashboard на фронтенде
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      // Используем setTimeout чтобы избежать синхронного setState в useEffect
      const timer = setTimeout(() => setHasEntities(null), 0);
      return () => clearTimeout(timer);
    }

    // Проверяем наличие сущностей асинхронно
    const checkHasEntities = async () => {
      try {
        const response = await fetch("/api/dashboard/has-entities", {
          cache: "no-store",
        });
        if (response.ok) {
          const { hasEntities: result } = await response.json();
          setHasEntities(result);
        } else {
          setHasEntities(false);
        }
      } catch (error) {
        console.error("Error checking entities:", error);
        setHasEntities(false);
      }
    };

    checkHasEntities();
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (!meetingRequestsEnabled || !isAuthenticated || !userId || !isVipUser) {
      const timer = setTimeout(() => setMeetingActionNeededCount(0), 0);
      return () => clearTimeout(timer);
    }

    let mounted = true;
    const loadCounts = async () => {
      try {
        const counts = await getMeetingRequestCounts();
        if (mounted) {
          setMeetingActionNeededCount(counts.action_needed_count || 0);
        }
      } catch {
        if (mounted) {
          setMeetingActionNeededCount(0);
        }
      }
    };

    loadCounts();
    const intervalId = setInterval(loadCounts, 45000);

    const onMeetingRequestsUpdated = () => {
      loadCounts();
    };

    window.addEventListener("meeting-requests-updated", onMeetingRequestsUpdated);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener("meeting-requests-updated", onMeetingRequestsUpdated);
    };
  }, [isAuthenticated, userId, isVipUser, meetingRequestsEnabled]);

  // Формируем динамический список ссылок навигации
  const dynamicNavLinks = [...navLinks];
  
  // Собираем дополнительные ссылки (Dashboard и Admin)
  const additionalLinks = [];
  if (hasEntities === true) {
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
    <header className="fixed top-0 left-0 right-0 z-[1000] glass hidden md:block">
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
                      // Вызываем trackEvent асинхронно, чтобы не блокировать навигацию
                      setTimeout(() => {
                        trackEvent("navigation_click", {
                          event_category: "Navigation",
                          event_label: link.label,
                          destination: link.href,
                        });
                      }, 0);
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
                  className="relative flex items-center gap-2"
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
                  {meetingActionNeededCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center pointer-events-none leading-none">
                      {meetingActionNeededCount > 99 ? "99+" : meetingActionNeededCount}
                    </span>
                  )}
                </Button>
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg shadow-lg overflow-hidden z-[1001]"
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
                        {meetingRequestsEnabled && (
                          <button
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              if (user.subscription_tier !== "vip") {
                                setShowMeetingRequestsProModal(true);
                                return;
                              }
                              router.push(`/profile/${user.twitter_handle}?meetingRequests=1`);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] flex items-center justify-between gap-2 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <CalendarClock className="w-4 h-4" />
                              Meeting requests
                            </span>
                            {meetingActionNeededCount > 0 && (
                              <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
                                {meetingActionNeededCount > 99 ? "99+" : meetingActionNeededCount}
                              </span>
                            )}
                          </button>
                        )}
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

      <ProSubscriptionModal
        isOpen={showMeetingRequestsProModal}
        onClose={() => setShowMeetingRequestsProModal(false)}
        title="Meeting requests are available only with PRO subscription"
        description="Upgrade to PRO to send and respond to meeting requests."
      />
    </header>
  );
}

export function Header() {
  const pathname = usePathname();

  const shouldUseLandingHeader =
    pathname === "/events" ||
    pathname.startsWith("/events/") ||
    pathname === "/map" ||
    pathname.startsWith("/map/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/activate" ||
    pathname.startsWith("/activate/") ||
    pathname === "/map-v1" ||
    pathname.startsWith("/map-v1/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/profile-v1" ||
    pathname.startsWith("/profile-v1/") ||
    pathname === "/profile-v2" ||
    pathname.startsWith("/profile-v2/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/");

  if (shouldUseLandingHeader) {
    return <LandingHeader />;
  }

  // return <LegacyHeader />; // Keep legacy header as default for all other pages.
  return <LegacyHeader />;
}
