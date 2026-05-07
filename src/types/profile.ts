export type FriendshipStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted"
  | "blocked";

export type UsersFilterType = "all" | "country" | "city";

export interface DirectoryUser {
  id: string;
  avatar_url?: string | null;
  name: string;
  twitter_handle?: string;
  isVerified?: boolean;
  isOwner?: boolean;
  joinedAt?: string;
}

export type ProfileAffiliationType =
  | "hub"
  | "community"
  | "project"
  | "workspace"
  | "event";

export interface ProfileAffiliation {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  type: ProfileAffiliationType;
  country?: string | null;
  city?: string | null;
  start_date?: string;
}
