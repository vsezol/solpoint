"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import type { Hub } from "@/types";

interface HubViewTrackerProps {
  hub: Hub;
}

export function HubViewTracker({ hub }: HubViewTrackerProps) {
  useEffect(() => {
    trackEvent("hub_view", {
      event_category: "Hubs",
      event_label: hub.slug || hub.id,
      hub_id: hub.id,
      hub_slug: hub.slug,
      hub_name: hub.name,
      members_count: hub.members_count,
      country: hub.country,
    });
  }, [hub]);

  return null;
}

