"use client";

import { trackEvent } from "@/lib/analytics";
import type { Event } from "@/types";
import { Twitter, Instagram, Facebook, ExternalLink } from "lucide-react";

interface EventSocialLinkProps {
  event: Event;
  platform: "twitter" | "instagram" | "facebook" | "website";
  href: string;
}

const icons = {
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  website: ExternalLink,
};

export function EventSocialLink({ event, platform, href }: EventSocialLinkProps) {
  const Icon = icons[platform];

  const handleClick = () => {
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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="p-3 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
    >
      <Icon className="w-5 h-5" />
    </a>
  );
}

