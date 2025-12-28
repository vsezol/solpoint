"use client";

import { Button } from "@/components/ui";
import { Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { Project } from "@/types";

interface ProjectShareButtonProps {
  project: Project;
  variant?: "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProjectShareButton({ 
  project, 
  variant = "ghost", 
  size = "sm",
  className 
}: ProjectShareButtonProps) {
  const handleShare = () => {
    trackEvent("project_share_click", {
      event_category: "Projects",
      event_label: project.slug || project.id,
      project_id: project.id,
      project_slug: project.slug,
      project_name: project.name,
      source: "project_page",
    });
    // TODO: Implement share functionality
  };

  return (
    <Button variant={variant} size={size} onClick={handleShare} className={className}>
      <Share2 className={size === "lg" ? "w-4 h-4 mr-2" : "w-5 h-5"} />
      {size === "lg" && "Share Project"}
    </Button>
  );
}

