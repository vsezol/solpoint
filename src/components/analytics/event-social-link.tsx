"use client";

import { trackEvent } from "@/lib/analytics";
import type { Event } from "@/types";
import { Twitter, Instagram, Facebook, ExternalLink } from "lucide-react";

interface EventSocialLinkProps {
  event: Event;
  platform: "twitter" | "instagram" | "facebook" | "website" | "luma";
  href: string;
}

const icons = {
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  website: ExternalLink,
  luma: ExternalLink,
};

export function EventSocialLink({ event, platform, href }: EventSocialLinkProps) {
  const Icon = icons[platform];

  const handleClick = () => {
    // Вызываем trackEvent асинхронно, чтобы не блокировать открытие ссылки
    setTimeout(() => {
      trackEvent("event_social_link_click", {
        event_category: "Events",
        event_label: event.slug || event.id,
        event_id: event.id,
        event_slug: event.slug,
        event_name: event.name,
        social_platform: platform,
        source: "event_page",
      });
    }, 0);
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="p-2 rounded-full border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors flex-shrink-0"
    >
      <Icon className="w-5 h-5" />
    </a>
  );
}

