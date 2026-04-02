"use client";

import { Button, EventBadges } from "@/components/ui";
import type { Event } from "@/types";
import { Twitter, Instagram, Facebook, ExternalLink, MapPin, Calendar, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { useState } from "react";
import { attendEvent } from "@/app/events/[slug]/actions";

interface EventCardProps {
  event: Event;
  isVip?: boolean;
  isAuthenticated?: boolean;
  compact?: boolean;
  isBlurred?: boolean;
  isRegistered?: boolean;
}

export function EventCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl overflow-hidden flex flex-col h-full animate-pulse">
      {/* Image/Icon Section */}
      <div className="relative h-48 bg-[var(--color-surface-hover)] flex-shrink-0">
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <div className="h-6 w-20 bg-[var(--color-surface-hover)] rounded-full"></div>
          <div className="h-6 w-16 bg-[var(--color-surface-hover)] rounded-full"></div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Title */}
        <div className="h-6 bg-[var(--color-surface-hover)] rounded mb-2 w-3/4"></div>

        {/* Description */}
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-[var(--color-surface-hover)] rounded w-full"></div>
          <div className="h-4 bg-[var(--color-surface-hover)] rounded w-5/6"></div>
        </div>

        {/* Info */}
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-[var(--color-surface-hover)] rounded w-2/3"></div>
          <div className="h-4 bg-[var(--color-surface-hover)] rounded w-1/2"></div>
        </div>

        {/* Attendees */}
        <div className="h-4 bg-[var(--color-surface-hover)] rounded w-1/3 mb-4"></div>

        {/* Socials */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 bg-[var(--color-surface-hover)] rounded-full"></div>
          <div className="h-8 w-8 bg-[var(--color-surface-hover)] rounded-full"></div>
        </div>

        {/* Spacer */}
        <div className="flex-grow"></div>

        {/* Button */}
        <div className="h-10 bg-[var(--color-surface-hover)] rounded w-full mt-auto"></div>
      </div>
    </div>
  );
}

export function EventCard({
  event,
  isVip = false,
  isAuthenticated = false,
  compact = false,
  isBlurred = false,
  isRegistered = false,
}: EventCardProps) {
  const [showAttendModal, setShowAttendModal] = useState(false);
  const [attendLoading, setAttendLoading] = useState(false);
  const [attendError, setAttendError] = useState<string | null>(null);
  const [attended, setAttended] = useState(isRegistered);

  // Определяем, может ли пользователь видеть детали события
  const canViewDetails = isAuthenticated && (
    event.visibility === "public" || 
    (event.visibility === "vip_only" && isVip)
  );

  const formatDate = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const startStr = start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    if (!endDate) return startStr;

    const end = new Date(endDate);
    const endStr = end.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    // Format: "Thu, Dec 11 - Sat, Dec 13"
    return `${startStr} - ${endStr}`;
  };


  const kmFont = { fontFamily: "var(--font-kode-mono), monospace" } as const;

  if (compact) {
    return (
      <div className="p-4 min-w-[280px] max-w-[350px] bg-[#101319] border border-white/8 rounded-[10px]">
        {/* Image */}
        <div className="relative w-16 h-16 mx-auto mb-3 rounded-[7px] overflow-hidden bg-white/10">
          {event.image_url ? (
            <Image src={event.image_url} alt={event.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#14f195]">
              <Calendar className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="font-semibold text-white text-center mb-3 leading-snug" style={kmFont}>
          {event.name}
        </h3>

        {/* Info */}
        <div className={cn("space-y-1 text-sm mb-3", isBlurred && !isVip && "blur-sm select-none")} style={kmFont}>
          <p className="text-white/70">
            <span className="text-[#14f195]">Country:</span>{" "}{event.country}
          </p>
          <p className="text-white/70">
            <span className="text-[#14f195]">City:</span>{" "}{event.city}
          </p>
          <p className="text-white/70">
            <span className="text-[#14f195]">Date:</span>{" "}{formatDate(event.start_date, event.end_date)}
          </p>
        </div>

        {/* Socials */}
        {isVip && (
          <div className="flex items-center gap-2 mb-4 justify-center">
            <span className="text-xs text-white/40" style={kmFont}>Socials:</span>
            {event.socials?.twitter && (
              <a href={event.socials.twitter} target="_blank" rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); trackEvent("event_social_link_click", { event_category: "Events", event_label: event.slug || event.id, event_id: event.id, social_platform: "twitter", source: "event_card_compact" }); }}
                className="p-1.5 rounded-[5px] bg-white/10 text-white/60 hover:text-white transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {event.socials?.instagram && (
              <a href={event.socials.instagram} target="_blank" rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); trackEvent("event_social_link_click", { event_category: "Events", event_label: event.slug || event.id, event_id: event.id, social_platform: "instagram", source: "event_card_compact" }); }}
                className="p-1.5 rounded-[5px] bg-white/10 text-white/60 hover:text-white transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {event.socials?.facebook && (
              <a href={event.socials.facebook} target="_blank" rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); trackEvent("event_social_link_click", { event_category: "Events", event_label: event.slug || event.id, event_id: event.id, social_platform: "facebook", source: "event_card_compact" }); }}
                className="p-1.5 rounded-[5px] bg-white/10 text-white/60 hover:text-white transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        {canViewDetails ? (
          <div className="flex justify-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              className={cn(
                "h-[49px] w-[125px] shrink-0 rounded-[7px] border text-[13px] font-bold transition-opacity",
                attended
                  ? "cursor-default border-white/30 bg-[#1A1A1A] text-white/75"
                  : "border-white bg-white text-black hover:bg-white/90"
              )}
              style={{ fontFamily: "var(--font-kode-mono), monospace", fontWeight: 700, letterSpacing: "-0.05em" }}
              disabled={attended}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!attended) setShowAttendModal(true);
              }}
            >
              {attended ? "Attending" : "Attend"}
            </button>

            {/* Show List button — placeholder, coming soon */}
            {/* <div
              className="w-[125px] shrink-0 rounded-[7px] p-px"
              style={{ background: "linear-gradient(to right, #9849FC, #01F48B)" }}
            >
              <button
                className="h-[47px] w-full rounded-[6px] bg-black text-white text-[13px] font-bold hover:bg-white/5 transition-colors"
                style={{ fontFamily: "var(--font-kode-mono), monospace", fontWeight: 700, letterSpacing: "-0.05em" }}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
              >
                Show list
              </button>
            </div> */}

            {/* Attend confirmation modal */}
            {showAttendModal && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); setShowAttendModal(false); setAttendError(null); }}
              >
                <div
                  className="bg-[#101319] border border-white/[0.08] rounded-[10px] w-full max-w-sm mx-4 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-6 py-4 border-b border-white/[0.08]">
                    <h3
                      className="text-[18px] font-semibold text-white"
                      style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                    >
                      Confirm attendance
                    </h3>
                    <p
                      className="mt-1 text-sm text-white/60"
                      style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                    >
                      Are you sure you are going to {event.name}?
                    </p>
                  </div>
                  <div className="px-6 py-4">
                    {attendError ? (
                      <p className="rounded border border-red-500/35 bg-red-500/10 px-3 py-2 text-[13px] text-red-200">
                        {attendError}
                      </p>
                    ) : (
                      <p className="text-[13px] text-white/70" style={{ fontFamily: "var(--font-kode-mono), monospace" }}>
                        We will add you to the internal attendees list for this event.
                      </p>
                    )}
                  </div>
                  <div className="px-6 py-4 border-t border-white/[0.08] flex justify-end gap-3">
                    <button
                      className="h-[40px] px-4 rounded-[7px] border border-white/35 bg-transparent text-white text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                      style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                      onClick={() => { setShowAttendModal(false); setAttendError(null); }}
                      disabled={attendLoading}
                    >
                      Cancel
                    </button>
                    <button
                      className="h-[40px] px-4 rounded-[7px] border border-white bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                      style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                      disabled={attendLoading}
                      onClick={async () => {
                        setAttendLoading(true);
                        setAttendError(null);
                        trackEvent("event_attend_click", { event_category: "Events", event_label: event.slug || event.id, event_id: event.id, event_slug: event.slug, event_name: event.name, source: "map_popup" });
                        try {
                          const result = await attendEvent(event.id);
                          if (result.success) {
                            setAttended(true);
                            setShowAttendModal(false);
                            trackEvent("event_attend_success", { event_category: "Events", event_label: event.slug || event.id, event_id: event.id, event_name: event.name, source: "map_popup" });
                          } else {
                            setAttendError(result.error || "Failed to register");
                          }
                        } catch {
                          setAttendError("An unexpected error occurred");
                        } finally {
                          setAttendLoading(false);
                        }
                      }}
                    >
                      {attendLoading && (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Button variant="secondary" size="sm" asChild>
                <Link href="/signup" onClick={(e) => e.stopPropagation()}>Sign up / Log in</Link>
              </Button>
            </div>
            <div className="blur-sm pointer-events-none opacity-50 flex justify-center">
              <button className="h-[49px] w-[125px] rounded-[7px] border border-white bg-white text-black text-[13px] font-bold" style={{ fontFamily: "var(--font-kode-mono), monospace" }}>Attend</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full card view
  return (
    <div className="block h-full">
      <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl overflow-hidden flex flex-col h-full transition-all duration-200">
      {/* Image/Icon Section */}
      <div className="relative h-48 bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-[var(--color-secondary)]/20 flex-shrink-0">
        {event.image_url ? (
          <Image
            src={event.image_url}
            alt={event.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="w-20 h-20 text-[var(--color-text-primary)] opacity-60 stroke-[1.5]" />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-3 left-3">
          <EventBadges event={event} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          {event.name}
        </h3>

        {event.description && (
          <p className="text-[var(--color-text-secondary)] mb-4 line-clamp-2 text-sm whitespace-pre-line">
            {event.description}
          </p>
        )}

        {/* Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm">
            <MapPin className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
            <span>
              {event.city}, {event.country}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm">
            <Calendar className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
            <span>{formatDate(event.start_date, event.end_date)}</span>
          </div>
        </div>

        {/* Attendees */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-[var(--color-text-secondary)]">
            {event.attendees_count} attending
            {event.max_attendees && ` / ${event.max_attendees} max`}
          </span>
        </div>

        {/* Socials */}
        <div className="flex items-center gap-2 mb-4">
          {event.socials?.twitter && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                trackEvent("event_social_link_click", {
                  event_category: "Events",
                  event_label: event.slug || event.id,
                  event_id: event.id,
                  social_platform: "twitter",
                  source: "event_card_full",
                });
                window.open(event.socials?.twitter, '_blank', 'noopener,noreferrer');
              }}
              className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-4 h-4" />
            </button>
          )}
          {event.socials?.instagram && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                trackEvent("event_social_link_click", {
                  event_category: "Events",
                  event_label: event.slug || event.id,
                  event_id: event.id,
                  social_platform: "instagram",
                  source: "event_card_full",
                });
                window.open(event.socials?.instagram, '_blank', 'noopener,noreferrer');
              }}
              className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </button>
          )}
          {event.socials?.facebook && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                trackEvent("event_social_link_click", {
                  event_category: "Events",
                  event_label: event.slug || event.id,
                  event_id: event.id,
                  social_platform: "facebook",
                  source: "event_card_full",
                });
                window.open(event.socials?.facebook, '_blank', 'noopener,noreferrer');
              }}
              className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-4 h-4" />
            </button>
          )}
          {event.socials?.website && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                trackEvent("event_social_link_click", {
                  event_category: "Events",
                  event_label: event.slug || event.id,
                  event_id: event.id,
                  social_platform: "website",
                  source: "event_card_full",
                });
                window.open(event.socials?.website, '_blank', 'noopener,noreferrer');
              }}
              className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Website"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-grow"></div>

        {/* Actions */}
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            className="w-full text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 mt-auto cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              // Вызываем trackEvent асинхронно, чтобы не блокировать UI
              setTimeout(() => {
                trackEvent("event_share_click", {
                  event_category: "Events",
                  event_label: event.slug || event.id,
                  event_id: event.id,
                  event_slug: event.slug,
                  event_name: event.name,
                  source: "event_card_full",
                });
              }, 0);
              // Share functionality
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
    </div>
  );
}

