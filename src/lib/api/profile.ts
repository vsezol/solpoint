import type { Event, User } from "@/types";
import type { ProfileAffiliation } from "@/types/profile";

export interface ProfileDataResponse {
  pastEvents: Event[];
  friendsCount: number;
  friendshipStatus: "none" | "pending_sent" | "pending_received" | "accepted";
  upcomingEvents: Event[];
}

export interface ProfileStatsResponse {
  total: number;
  inCountry: number;
  inCity: number;
}

export interface ProfileAffiliationsResponse {
  affiliations: ProfileAffiliation[];
  count: number;
}

async function parseJsonOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed with status ${response.status}`);
  }
  return data;
}

export async function getProfileData(userId: string): Promise<ProfileDataResponse> {
  const response = await fetch(`/api/profile/data?user_id=${encodeURIComponent(userId)}`);
  return (await parseJsonOrThrow(response)) as ProfileDataResponse;
}

export async function getProfileStats(params: {
  country_code?: string;
  city?: string;
}): Promise<ProfileStatsResponse> {
  const query = new URLSearchParams();
  if (params.country_code) {
    query.set("country_code", params.country_code);
  }
  if (params.city) {
    query.set("city", params.city);
  }

  const response = await fetch(`/api/profile/stats?${query.toString()}`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  return (await parseJsonOrThrow(response)) as ProfileStatsResponse;
}

export async function getProfileAffiliations(params: {
  isOwnProfile: boolean;
  userId: string;
}): Promise<ProfileAffiliation[]> {
  const url = params.isOwnProfile
    ? "/api/profile/affiliations"
    : `/api/profile/affiliations?user_id=${encodeURIComponent(params.userId)}`;

  const response = await fetch(url);
  const data = (await parseJsonOrThrow(response)) as ProfileAffiliationsResponse;
  return data.affiliations || [];
}

export async function updateOpenToMeet(is_open_to_meet: boolean): Promise<User> {
  const response = await fetch("/api/profile/open-to-meet", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_open_to_meet }),
  });

  const data = (await parseJsonOrThrow(response)) as { profile?: User };
  if (!data.profile) {
    throw new Error("Invalid response from server");
  }

  return data.profile;
}

export async function uploadProfileBanner(file: File): Promise<{ banner_url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/profile/banner", {
    method: "POST",
    body: formData,
  });

  const data = (await parseJsonOrThrow(response)) as { banner_url?: string };
  if (!data.banner_url) {
    throw new Error("Invalid response from server");
  }

  return { banner_url: data.banner_url };
}

export async function deleteProfileBanner(): Promise<void> {
  const response = await fetch("/api/profile/banner", {
    method: "DELETE",
  });

  await parseJsonOrThrow(response);
}

export async function getCurrentSubscription(): Promise<{ subscription: { status: string } | null }> {
  const response = await fetch("/api/subscriptions/current");
  return (await parseJsonOrThrow(response)) as { subscription: { status: string } | null };
}

export async function getMutualFollowers(): Promise<User[]> {
  const response = await fetch("/api/twitter/mutual-followers");
  const data = (await parseJsonOrThrow(response)) as { mutualFollowers?: User[] };
  return data.mutualFollowers || [];
}
