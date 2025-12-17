"use client";

import { Button } from "@/components/ui";
import { trackEvent } from "@/lib/analytics";
import type { Hub } from "@/types";

interface HubJoinButtonProps {
  hub: Hub;
  isMember: boolean;
  onJoin?: () => void;
}

export function HubJoinButton({ hub, isMember, onJoin }: HubJoinButtonProps) {
  const handleJoin = () => {
    if (isMember) return;
    
    trackEvent("hub_join_click", {
      event_category: "Hubs",
      event_label: hub.slug || hub.id,
      hub_id: hub.id,
      hub_slug: hub.slug,
      hub_name: hub.name,
    });
    
    if (onJoin) {
      onJoin();
    }
  };

  return (
    <Button 
      variant={isMember ? "outline" : "primary"} 
      className="w-full" 
      size="lg"
      onClick={handleJoin}
      disabled={isMember}
    >
      {isMember ? "Member" : "Join Hub"}
    </Button>
  );
}

