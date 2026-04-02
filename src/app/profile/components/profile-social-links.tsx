"use client";

import type { ComponentType } from "react";
import {
  BookOpen,
  Facebook,
  Github,
  Instagram,
  Linkedin,
  MessageSquare,
  Rss,
  Send,
  Twitter,
  Youtube,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { User } from "@/types";

interface ProfileSocialLinksProps {
  user: User;
}

interface SocialConfig {
  key:
    | "twitter"
    | "instagram"
    | "facebook"
    | "telegram"
    | "youtube"
    | "discord"
    | "github"
    | "linkedin"
    | "medium"
    | "substack";
  platform:
    | "twitter"
    | "instagram"
    | "facebook"
    | "telegram"
    | "youtube"
    | "discord"
    | "github"
    | "linkedin"
    | "medium"
    | "substack";
  label: string;
  icon: ComponentType<{ className?: string }>;
  getHref: (user: User) => string | null;
}

const SOCIALS: SocialConfig[] = [
  {
    key: "twitter",
    platform: "twitter",
    label: "Twitter",
    icon: Twitter,
    getHref: (user) => `https://twitter.com/${user.twitter_handle}`,
  },
  {
    key: "instagram",
    platform: "instagram",
    label: "Instagram",
    icon: Instagram,
    getHref: (user) => user.socials?.instagram || null,
  },
  {
    key: "facebook",
    platform: "facebook",
    label: "Facebook",
    icon: Facebook,
    getHref: (user) => user.socials?.facebook || null,
  },
  {
    key: "telegram",
    platform: "telegram",
    label: "Telegram",
    icon: Send,
    getHref: (user) => user.socials?.telegram || null,
  },
  {
    key: "youtube",
    platform: "youtube",
    label: "YouTube",
    icon: Youtube,
    getHref: (user) => user.socials?.youtube || null,
  },
  {
    key: "discord",
    platform: "discord",
    label: "Discord",
    icon: MessageSquare,
    getHref: (user) => user.socials?.discord || null,
  },
  {
    key: "github",
    platform: "github",
    label: "GitHub",
    icon: Github,
    getHref: (user) => user.socials?.github || null,
  },
  {
    key: "linkedin",
    platform: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    getHref: (user) => user.socials?.linkedin || null,
  },
  {
    key: "medium",
    platform: "medium",
    label: "Medium",
    icon: BookOpen,
    getHref: (user) => user.socials?.medium || null,
  },
  {
    key: "substack",
    platform: "substack",
    label: "Substack",
    icon: Rss,
    getHref: (user) => user.socials?.substack || null,
  },
];

export function ProfileSocialLinks({ user }: ProfileSocialLinksProps) {
  return (
    <div className="w-fit">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)]">Socials</h3>
        <div className="flex flex-wrap gap-2">
          {SOCIALS.map(({ key, icon: Icon, label, platform, getHref }) => {
            const href = getHref(user);
            if (!href) {
              return null;
            }

            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackEvent("profile_social_link_click", {
                    event_category: "Profiles",
                    event_label: user.twitter_handle || user.id,
                    target_user_id: user.id,
                    social_platform: platform,
                  });
                }}
                className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                aria-label={label}
              >
                <Icon className="w-5 h-5" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
