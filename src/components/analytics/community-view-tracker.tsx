"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import type { Community } from "@/types";

interface CommunityViewTrackerProps {
  community: Community;
}

export function CommunityViewTracker({ community }: CommunityViewTrackerProps) {
  useEffect(() => {
    trackEvent("community_view", {
      event_category: "Communities",
      event_label: community.slug || community.id,
      community_id: community.id,
      community_slug: community.slug,
      community_name: community.name,
      members_count: community.members_count,
      country: community.country || "",
    });
  }, [community]);

  return null;
}

