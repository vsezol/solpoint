"use client";

import { trackEvent } from "@/lib/analytics";
import type { Workspace } from "@/types";
import { Twitter, Instagram, Facebook, ExternalLink } from "lucide-react";

interface WorkspaceSocialLinkProps {
  workspace: Workspace;
  platform: "twitter" | "instagram" | "facebook" | "website";
  href: string;
}

const icons = {
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  website: ExternalLink,
};

export function WorkspaceSocialLink({ workspace, platform, href }: WorkspaceSocialLinkProps) {
  const Icon = icons[platform];

  const handleClick = () => {
    // Вызываем trackEvent асинхронно, чтобы не блокировать открытие ссылки
    setTimeout(() => {
      trackEvent("workspace_social_link_click", {
        event_category: "Workspaces",
        event_label: workspace.slug || workspace.id,
        workspace_id: workspace.id,
        workspace_slug: workspace.slug,
        workspace_name: workspace.name,
        social_platform: platform,
        source: "workspace_page",
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

