"use client";

import { trackEvent } from "@/lib/analytics";
import type { Event } from "@/types";

interface EventSocialLinksTrackerProps {
  event: Event;
}

export function EventSocialLinksTracker({ event }: EventSocialLinksTrackerProps) {
  const handleSocialClick = (platform: string) => {
    trackEvent("event_social_link_click", {
      event_category: "Events",
      event_label: event.slug || event.id,
      event_id: event.id,
      event_slug: event.slug,
      event_name: event.name,
      social_platform: platform,
      source: "event_page",
    });
  };

  return (
    <>
      {event.socials?.twitter && (
        <a
          href={event.socials.twitter}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleSocialClick("twitter")}
          className="p-3 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {/* Twitter icon will be rendered by parent */}
        </a>
      )}
      {event.socials?.instagram && (
        <a
          href={event.socials.instagram}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleSocialClick("instagram")}
          className="p-3 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {/* Instagram icon will be rendered by parent */}
        </a>
      )}
      {event.socials?.facebook && (
        <a
          href={event.socials.facebook}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleSocialClick("facebook")}
          className="p-3 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {/* Facebook icon will be rendered by parent */}
        </a>
      )}
      {event.socials?.website && (
        <a
          href={event.socials.website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleSocialClick("website")}
          className="p-3 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {/* ExternalLink icon will be rendered by parent */}
        </a>
      )}
    </>
  );
}

