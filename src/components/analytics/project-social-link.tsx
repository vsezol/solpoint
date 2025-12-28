"use client";

import { trackEvent } from "@/lib/analytics";
import type { Project } from "@/types";
import { Twitter, Instagram, Facebook, ExternalLink } from "lucide-react";

interface ProjectSocialLinkProps {
  project: Project;
  platform: "twitter" | "instagram" | "facebook" | "website";
  href: string;
}

const icons = {
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  website: ExternalLink,
};

export function ProjectSocialLink({ project, platform, href }: ProjectSocialLinkProps) {
  const Icon = icons[platform];

  const handleClick = () => {
    trackEvent("project_social_link_click", {
      event_category: "Projects",
      event_label: project.slug || project.id,
      project_id: project.id,
      project_slug: project.slug,
      project_name: project.name,
      social_platform: platform,
      source: "project_page",
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

