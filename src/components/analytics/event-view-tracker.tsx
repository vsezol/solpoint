"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import type { Event } from "@/types";

interface EventViewTrackerProps {
  event: Event;
}

export function EventViewTracker({ event }: EventViewTrackerProps) {
  useEffect(() => {
    trackEvent("event_view", {
      event_category: "Events",
      event_label: event.slug || event.id,
      event_id: event.id,
      event_slug: event.slug,
      event_type: event.event_type,
      event_name: event.name,
      is_paid: event.is_paid || false,
      price_sol: event.price_sol || 0,
      visibility: event.visibility,
    });
  }, [event]);

  return null;
}
