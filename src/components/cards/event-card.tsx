"use client";

import { Button, Badge } from "@/components/ui";
import type { Event } from "@/types";
import { Twitter, Instagram, Facebook, ExternalLink, MapPin, Calendar, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface EventCardProps {
  event: Event;
  isVip?: boolean;
  compact?: boolean;
  isBlurred?: boolean;
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
  compact = false,
  isBlurred = false,
}: EventCardProps) {
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

  const eventTypeLabels: Record<string, string> = {
    official: "Official",
    community: "Community",
    private: "Private",
    meetup: "Meetup",
  };

  if (compact) {
    return (
      <Link href={`/events/${event.slug}`} className="block">
        <div className="p-4 min-w-[280px] border border-[var(--color-surface-border)] rounded-xl transition-all duration-200 hover:scale-[1.02] hover:border-white cursor-pointer">
        {/* Image */}
        <div className="relative w-16 h-16 mx-auto mb-3 rounded-xl overflow-hidden bg-[var(--color-surface-hover)]">
          {event.image_url ? (
            <Image
              src={event.image_url}
              alt={event.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-primary)]">
              <Calendar className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="font-semibold text-[var(--color-text-primary)] text-center mb-3">
          {event.name}
        </h3>

        {/* Info */}
        <div className={cn("space-y-1 text-sm mb-3", isBlurred && !isVip && "blur-sm select-none")}>
          <p className="text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-primary)]">Country:</span>{" "}
            {event.country}
          </p>
          <p className="text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-primary)]">City:</span>{" "}
            {event.city}
          </p>
          <p className="text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-primary)]">Date:</span>{" "}
            {formatDate(event.start_date, event.end_date)}
          </p>
        </div>

        {/* Socials */}
        {isVip && (
          <div className="flex items-center gap-2 mb-4 justify-center">
            <span className="text-xs text-[var(--color-text-muted)]">Socials:</span>
            {event.socials?.twitter && (
              <a
                href={event.socials.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {event.socials?.instagram && (
              <a
                href={event.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {event.socials?.facebook && (
              <a
                href={event.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        {isVip ? (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)]"
              onClick={(e) => {
                e.stopPropagation();
                // Share functionality
              }}
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/events/${event.slug}`;
              }}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Details
            </Button>
          </div>
        ) : (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Button variant="secondary" size="sm" asChild>
                <Link href="/signup" onClick={(e) => e.stopPropagation()}>Sign up / Log in</Link>
              </Button>
            </div>
            <div className="blur-sm pointer-events-none opacity-50">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Share
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Details
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </Link>
    );
  }

  // Full card view
  return (
    <Link href={`/events/${event.slug}`} className="block h-full">
      <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl overflow-hidden flex flex-col h-full transition-all duration-200 hover:scale-[1.02] hover:border-white cursor-pointer">
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
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge 
            variant="primary"
            className="bg-[#0F453E] text-[#00AB67] font-semibold border border-[#70767D]/40"
          >
            {eventTypeLabels[event.event_type] || event.event_type}
          </Badge>
          {event.is_paid ? (
            <Badge 
              variant="warning"
              className="bg-[#2A403A] text-[#BB8800] font-semibold border border-[#70767D]/40"
            >
              {event.price_sol} SOL
            </Badge>
          ) : (
            <Badge 
              variant="warning"
              className="bg-[#2A403A] text-[#BB8800] font-semibold border border-[#70767D]/40"
            >
              Free
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          {event.name}
        </h3>

        {event.description && (
          <p className="text-[var(--color-text-secondary)] mb-4 line-clamp-2 text-sm">
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
          {event.socials?.instagram && (
            <a
              href={event.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
          )}
          {event.socials?.website && (
            <a
              href={event.socials.website}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-grow"></div>

        {/* Actions */}
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            className="w-full text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 mt-auto"
            onClick={(e) => {
              e.stopPropagation();
              // Share functionality
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
    </Link>
  );
}

