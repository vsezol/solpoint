"use client";

import { Button } from "@/components/ui";
import { Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { Community } from "@/types";

interface CommunityShareButtonProps {
  community: Community;
  variant?: "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CommunityShareButton({ 
  community, 
  variant = "ghost", 
  size = "sm",
  className 
}: CommunityShareButtonProps) {
  const handleShare = () => {
    trackEvent("community_share_click", {
      event_category: "Communities",
      event_label: community.slug || community.id,
      community_id: community.id,
      community_slug: community.slug,
      community_name: community.name,
      source: "community_page",
    });
    // TODO: Implement share functionality
  };

  return (
    <Button variant={variant} size={size} onClick={handleShare} className={className}>
      <Share2 className={size === "lg" ? "w-4 h-4 mr-2" : "w-5 h-5"} />
      {size === "lg" && "Share Community"}
    </Button>
  );
}

