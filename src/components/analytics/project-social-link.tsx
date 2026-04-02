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
    // Вызываем trackEvent асинхронно, чтобы не блокировать открытие ссылки
    setTimeout(() => {
      trackEvent("project_social_link_click", {
        event_category: "Projects",
        event_label: project.slug || project.id,
        project_id: project.id,
        project_slug: project.slug,
        project_name: project.name,
        social_platform: platform,
        source: "project_page",
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
