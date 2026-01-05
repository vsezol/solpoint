"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { Share2, Check } from "lucide-react";
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
  const [copied, setCopied] = useState(false);

  // Reset copied state after 1 second
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const isMobile = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      
      // On mobile devices, use Web Share API
      if (isMobile() && navigator.share) {
        try {
          await navigator.share({
            title: workspace.name,
            url: url,
          });
          trackEvent("workspace_share_click", {
            event_category: "Workspaces",
            event_label: workspace.slug || workspace.id,
            workspace_id: workspace.id,
            workspace_slug: workspace.slug,
            workspace_name: workspace.name,
            source: "workspace_page",
            share_method: "native",
          });
          return;
        } catch (err) {
          // User cancelled, don't do anything
          if ((err as Error).name === "AbortError") {
            return;
          }
        }
      }
      
      // On desktop, copy to clipboard and show checkmark
      await navigator.clipboard.writeText(url);
      setCopied(true);
      
      trackEvent("workspace_share_click", {
        event_category: "Workspaces",
        event_label: workspace.slug || workspace.id,
        workspace_id: workspace.id,
        workspace_slug: workspace.slug,
        workspace_name: workspace.name,
        source: "workspace_page",
        share_method: "clipboard",
      });
    } catch (error) {
      console.error("Error sharing workspace:", error);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleShare} className={className}>
      {copied ? (
        <>
          <Check className={size === "lg" ? "w-4 h-4 mr-2" : "w-5 h-5"} />
          {size === "lg" && "Copied!"}
        </>
      ) : (
        <>
          <Share2 className={size === "lg" ? "w-4 h-4 mr-2" : "w-5 h-5"} />
          {size === "lg" && "Share Workspace"}
        </>
      )}
    </Button>
  );
}

