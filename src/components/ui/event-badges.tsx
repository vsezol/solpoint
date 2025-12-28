"use client";

import { Badge } from "./badge";
import type { Event } from "@/types";
import { cn } from "@/lib/utils";

interface EventBadgesProps {
  event: Event;
  className?: string;
}

const eventTypeLabels: Record<string, string> = {
  official: "Official",
  community: "Community",
  private: "Private",
  meetup: "Meetup",
};

export function EventBadges({ event, className }: EventBadgesProps) {
  const badgeStyles = "bg-[#0F453E] text-[#00AB67] font-semibold border border-[#70767D]/40";
  const priceBadgeStyles = "bg-[#2A403A] text-[#BB8800] font-semibold border border-[#70767D]/40";

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Event Type Badge */}
      <Badge
        variant="primary"
        className={badgeStyles}
      >
        {eventTypeLabels[event.event_type] || event.event_type}
      </Badge>

      {/* Price Badge */}
      {event.is_paid ? (
        <Badge
          variant="warning"
          className={priceBadgeStyles}
        >
          {event.price_sol} SOL
        </Badge>
      ) : (
        <Badge
          variant="warning"
          className={priceBadgeStyles}
        >
          Free
        </Badge>
      )}
    </div>
  );
}

