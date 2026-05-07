"use client";

import { AuthRequiredModal, Button, EventBadges } from "@/components/ui";
import type { Event } from "@/types";
import { Twitter, Instagram, Facebook, ExternalLink, MapPin, Calendar, CalendarDays, Share2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface EventCardProps {
  event: Event;
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
  isAuthenticated = false,
  compact = false,
  isBlurred = false,
  isRegistered = false,
}: EventCardProps) {
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState("Log in or Sign up to continue");
  const [authRedirectTo, setAuthRedirectTo] = useState<string | undefined>(undefined);

  const canViewDetails = isAuthenticated;
  const computedAttendeesCount = Math.max(
    typeof event.attendees_count === "number" ? event.attendees_count : 0,
    // Some endpoints (e.g. showcase lists) use `people_going` instead.
    typeof (event as Event & { people_going?: number }).people_going === "number"
      ? (event as Event & { people_going?: number }).people_going!
      : 0,
    Array.isArray(event.attendee_previews) ? event.attendee_previews.length : 0
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
    const sgFont = { fontFamily: "var(--font-display), sans-serif" } as const;
    const previewAvatars = (event.attendee_previews && event.attendee_previews.length > 0
      ? event.attendee_previews
      : (event.organizers?.internal ?? []).map((u) => ({ id: u.id, avatar_url: u.avatar_url, name: u.twitter_name || u.twitter_handle || "?", twitter_handle: u.twitter_handle ?? null }))
    )
      .slice(0, 3)
      .map((u) => ({ url: u.avatar_url, name: u.name }));

    return (
      <div
        className="p-[1px] bg-[linear-gradient(180deg,#00F68B_0%,#0B0B0B_100%)] shadow-2xl shrink-0"
        style={{ width: 256, height: 374, borderRadius: 3 }}
      >
      <div
        className="bg-[#080b12] overflow-hidden flex flex-col w-full h-full"
        style={{ borderRadius: 3 }}
      >
        {/* Logo — 13px from top, centered */}
        <div className="flex justify-center" style={{ paddingTop: 13 }}>
          <div
            className="relative overflow-hidden bg-[#111520] flex-shrink-0"
            style={{ width: 70, height: 70, borderRadius: 3 }}
          >
            {event.image_url ? (
              <Image src={event.image_url} alt={event.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-[#14f195]/40" />
              </div>
            )}
          </div>
        </div>

        {/* Title — 10px below logo */}
        <h3
          className="font-bold text-white text-center leading-snug px-4 truncate"
          style={{ ...sgFont, fontSize: 12, marginTop: 10 }}
        >
          {event.name}
        </h3>

        {/* Date & Location — styled like user card role/location rows */}
        <div
          className={cn("w-full min-w-0 space-y-[10px] text-[15px] font-medium leading-none tracking-normal text-[#14f195]", isBlurred && "blur-sm select-none")}
          style={{ marginTop: 29, paddingLeft: 16, paddingRight: 16 }}
        >
          <p className="-ml-2 flex items-end gap-[7px]" style={kmFont}>
            <CalendarDays className="h-5 w-5 shrink-0 text-[#14f195]" strokeWidth={2} aria-hidden />
            <span className="min-w-0 truncate" style={{ letterSpacing: "-0.07em" }}>
              {formatDate(event.start_date, event.end_date)}
            </span>
          </p>
          <p className="-ml-2 flex items-end gap-[7px]" style={kmFont}>
            <MapPin className="h-5 w-5 shrink-0 text-[#14f195]" strokeWidth={2} aria-hidden />
            <span className="min-w-0 truncate">
              {event.venue_name || event.city}
            </span>
          </p>
        </div>

        {/* Attendees */}
        <div className="flex flex-col items-center" style={{ marginTop: 27 }}>
          {previewAvatars.length > 0 && (
            <div className="flex items-center">
              {previewAvatars.map((a, i) => (
                <div
                  key={i}
                  className="rounded-full border-2 border-[#080b12] overflow-hidden bg-[#1a2030] flex-shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    marginLeft: i === 0 ? 0 : -12,
                    zIndex: previewAvatars.length - i,
                    position: "relative",
                  }}
                >
                  {a.url ? (
                    <Image src={a.url} alt={a.name} width={40} height={40} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[#14f195]" style={kmFont}>
                      {a.name[0].toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-white" style={{ ...kmFont, fontSize: 15, fontWeight: 600, marginTop: previewAvatars.length > 0 ? 6 : 0 }}>
            {computedAttendeesCount > 0 ? `${computedAttendeesCount} people going!` : "Be first attendee!"}
          </p>
        </div>

        {/* Spacer pushes buttons to bottom */}
        <div className="flex-1" />

        {/* Action buttons — pinned to bottom */}
        <div className="flex justify-center gap-[10px]" style={{ paddingBottom: 11 }}>
          <button
            className={cn(
              "bg-white text-black font-bold transition-opacity shrink-0",
              canViewDetails ? "hover:opacity-90 active:opacity-75" : "hover:opacity-95 active:opacity-85"
            )}
            style={{ ...kmFont, fontSize: 20, width: 116, height: 49, borderRadius: 7 }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setTimeout(() => {
                trackEvent("event_attend_click", {
                  event_category: "Events",
                  event_label: event.slug || event.id,
                  event_id: event.id,
                  event_slug: event.slug,
                  event_name: event.name,
                  source: "event_card_compact",
                });
              }, 0);

              if (!canViewDetails) {
                setAuthModalTitle("Log in or Sign up to attend the event");
                setAuthRedirectTo(`/events?attend=${event.id}`);
                setShowAuthModal(true);
                return;
              }

              router.push(`/events?attend=${event.id}`);
            }}
          >
            Attend
          </button>
          <button
            className={cn(
              "text-white font-bold transition-opacity shrink-0",
              canViewDetails ? "hover:opacity-80 active:opacity-60" : "hover:opacity-90 active:opacity-75"
            )}
            style={{
              ...kmFont,
              fontSize: 20,
              width: 116,
              height: 49,
              borderRadius: 7,
              letterSpacing: "-0.07em",
              border: "1px solid transparent",
              background:
                "linear-gradient(#080b12, #080b12) padding-box, linear-gradient(135deg, #9849FC, #01F48B) border-box",
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setTimeout(() => {
                trackEvent("event_show_list_click", {
                  event_category: "Events",
                  event_label: event.slug || event.id,
                  event_id: event.id,
                  event_slug: event.slug,
                  event_name: event.name,
                  source: "event_card_compact",
                });
              }, 0);

              if (!canViewDetails) {
                setAuthModalTitle("Log in or Sign up to see attendee list");
                setAuthRedirectTo(`/events?selected_event=${event.id}`);
                setShowAuthModal(true);
                return;
              }

              router.push(`/events?selected_event=${event.id}`);
            }}
          >
            Show list
          </button>
        </div>

        <AuthRequiredModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          variant="compact"
          title={authModalTitle}
          redirectTo={authRedirectTo}
        />
      </div>
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
            {computedAttendeesCount} attending
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

