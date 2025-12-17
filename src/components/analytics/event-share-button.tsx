"use client";

import { Button } from "@/components/ui";
import { Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { Event } from "@/types";

interface EventShareButtonProps {
  event: Event;
  variant?: "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EventShareButton({ 
  event, 
  variant = "ghost", 
  size = "sm",
  className 
}: EventShareButtonProps) {
  const handleShare = () => {
    trackEvent("event_share_click", {
      event_category: "Events",
      event_label: event.slug || event.id,
      event_id: event.id,
      event_slug: event.slug,
      event_name: event.name,
      source: "event_page",
    });
    // TODO: Implement share functionality
  };

  return (
    <Button variant={variant} size={size} onClick={handleShare} className={className}>
      <Share2 className="w-5 h-5" />
    </Button>
  );
}

