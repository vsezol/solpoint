"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { Share2, Check } from "lucide-react";
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
            title: event.name,
            url: url,
          });
          trackEvent("event_share_click", {
            event_category: "Events",
            event_label: event.slug || event.id,
            event_id: event.id,
            event_slug: event.slug,
            event_name: event.name,
            source: "event_page",
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
      
      trackEvent("event_share_click", {
        event_category: "Events",
        event_label: event.slug || event.id,
        event_id: event.id,
        event_slug: event.slug,
        event_name: event.name,
        source: "event_page",
        share_method: "clipboard",
      });
    } catch (error) {
      console.error("Error sharing event:", error);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleShare} className={className}>
      {copied ? (
        <Check className="w-5 h-5" />
      ) : (
        <Share2 className="w-5 h-5" />
      )}
    </Button>
  );
}

