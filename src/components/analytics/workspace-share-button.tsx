"use client";

import { Button } from "@/components/ui";
import { Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { Workspace } from "@/types";

interface WorkspaceShareButtonProps {
  workspace: Workspace;
  variant?: "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function WorkspaceShareButton({ 
  workspace, 
  variant = "ghost", 
  size = "sm",
  className 
}: WorkspaceShareButtonProps) {
  const handleShare = () => {
    trackEvent("workspace_share_click", {
      event_category: "Workspaces",
      event_label: workspace.slug || workspace.id,
      workspace_id: workspace.id,
      workspace_slug: workspace.slug,
      workspace_name: workspace.name,
      source: "workspace_page",
    });
    // TODO: Implement share functionality
  };

  return (
    <Button variant={variant} size={size} onClick={handleShare} className={className}>
      <Share2 className={size === "lg" ? "w-4 h-4 mr-2" : "w-5 h-5"} />
      {size === "lg" && "Share Workspace"}
    </Button>
  );
}

