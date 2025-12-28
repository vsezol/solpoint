"use client";

import { trackEvent } from "@/lib/analytics";
import type { Hub } from "@/types";
import { Twitter, Instagram, Facebook, ExternalLink } from "lucide-react";

interface HubSocialLinkProps {
  hub: Hub;
  platform: "twitter" | "instagram" | "facebook" | "website";
  href: string;
}

const icons = {
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  website: ExternalLink,
};

export function HubSocialLink({ hub, platform, href }: HubSocialLinkProps) {
  const Icon = icons[platform];

  const handleClick = () => {
    trackEvent("hub_social_link_click", {
      event_category: "Hubs",
      event_label: hub.slug || hub.id,
      hub_id: hub.id,
      hub_slug: hub.slug,
      hub_name: hub.name,
      social_platform: platform,
      source: "hub_page",
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

