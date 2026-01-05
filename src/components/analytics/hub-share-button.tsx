"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { Share2, Check } from "lucide-react";
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
            title: hub.name,
            url: url,
          });
          trackEvent("hub_share_click", {
            event_category: "Hubs",
            event_label: hub.slug || hub.id,
            hub_id: hub.id,
            hub_slug: hub.slug,
            hub_name: hub.name,
            source: "hub_page",
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
      
      trackEvent("hub_share_click", {
        event_category: "Hubs",
        event_label: hub.slug || hub.id,
        hub_id: hub.id,
        hub_slug: hub.slug,
        hub_name: hub.name,
        source: "hub_page",
        share_method: "clipboard",
      });
    } catch (error) {
      console.error("Error sharing hub:", error);
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
          {size === "lg" && "Share Hub"}
        </>
      )}
    </Button>
  );
}

