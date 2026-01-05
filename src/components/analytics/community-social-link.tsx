"use client";

import { trackEvent } from "@/lib/analytics";
import type { Community } from "@/types";
import { Twitter, Instagram, Facebook, ExternalLink } from "lucide-react";

interface CommunitySocialLinkProps {
  community: Community;
  platform: "twitter" | "instagram" | "facebook" | "website";
  href: string;
}

const icons = {
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  website: ExternalLink,
};

export function CommunitySocialLink({ community, platform, href }: CommunitySocialLinkProps) {
  const Icon = icons[platform];

  const handleClick = () => {
    // Вызываем trackEvent асинхронно, чтобы не блокировать открытие ссылки
    setTimeout(() => {
      trackEvent("community_social_link_click", {
        event_category: "Communities",
        event_label: community.slug || community.id,
        community_id: community.id,
        community_slug: community.slug,
        community_name: community.name,
        social_platform: platform,
        source: "community_page",
      });
    }, 0);
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

