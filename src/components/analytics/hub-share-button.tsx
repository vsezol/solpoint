"use client";

import { Button } from "@/components/ui";
import { Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { Hub } from "@/types";

interface HubShareButtonProps {
  hub: Hub;
  variant?: "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function HubShareButton({ 
  hub, 
  variant = "ghost", 
  size = "sm",
  className 
}: HubShareButtonProps) {
  const handleShare = () => {
    trackEvent("hub_share_click", {
      event_category: "Hubs",
      event_label: hub.slug || hub.id,
      hub_id: hub.id,
      hub_slug: hub.slug,
      hub_name: hub.name,
      source: "hub_page",
    });
    // TODO: Implement share functionality
  };

  return (
    <Button variant={variant} size={size} onClick={handleShare} className={className}>
      <Share2 className={size === "lg" ? "w-4 h-4 mr-2" : "w-5 h-5"} />
      {size === "lg" && "Share Hub"}
    </Button>
  );
}

