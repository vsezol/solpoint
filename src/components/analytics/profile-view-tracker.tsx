"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import type { User } from "@/types";

interface ProfileViewTrackerProps {
  user: User;
  isOwnProfile: boolean;
}

export function ProfileViewTracker({ user, isOwnProfile }: ProfileViewTrackerProps) {
  useEffect(() => {
    trackEvent("profile_view", {
      event_category: "Profiles",
      event_label: user.twitter_handle || user.id,
      user_id: user.id,
      is_own_profile: isOwnProfile,
      is_vip: user.subscription_tier === "vip",
      is_verified: user.is_verified || false,
      has_bio: !!user.bio,
      has_role: !!user.role,
    });
  }, [user, isOwnProfile]);

  return null;
}

