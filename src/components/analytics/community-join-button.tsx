"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { trackEvent } from "@/lib/analytics";
import type { Community } from "@/types";
import { useRouter } from "next/navigation";

interface CommunityJoinButtonProps {
  community: Community;
  isMember: boolean;
  onJoin?: () => void;
}

export function CommunityJoinButton({ community, isMember, onJoin }: CommunityJoinButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    if (isMember || isLoading) return;
    
    setIsLoading(true);
    
    trackEvent("community_join_click", {
      event_category: "Communities",
      event_label: community.slug || community.id,
      community_id: community.id,
      community_slug: community.slug,
      community_name: community.name,
    });
    
    try {
      // TODO: Implement join API call
      // For now, we'll use the onJoin callback if provided
      if (onJoin) {
        await onJoin();
      } else {
        // Fallback: reload the page to update membership status
        router.refresh();
      }
    } catch (error) {
      console.error("Error joining community:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant={isMember ? "outline" : "primary"} 
      className="w-full" 
      size="lg"
      onClick={handleJoin}
      disabled={isMember || isLoading}
    >
      {isMember ? "Member" : isLoading ? "Joining..." : "Join Community"}
    </Button>
  );
}

