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
    // Вызываем trackEvent асинхронно, чтобы не блокировать открытие ссылки
    setTimeout(() => {
      trackEvent("hub_social_link_click", {
        event_category: "Hubs",
        event_label: hub.slug || hub.id,
        hub_id: hub.id,
        hub_slug: hub.slug,
        hub_name: hub.name,
        social_platform: platform,
        source: "hub_page",
      });
    }, 0);
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-white/20 bg-[#20201f] text-white/80 transition-colors hover:bg-[#2a2a2a] hover:text-white"
    >
      <Icon className="w-5 h-5" />
    </a>
  );
}
