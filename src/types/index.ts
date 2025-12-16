// User types
export type UserRole = "degen" | "developer" | "trader" | "investor" | "designer" | "founder" | "other";
export type SubscriptionTier = "free" | "vip";

// Country type
export interface Country {
  code: string; // ISO 3166-1 alpha-2 (2 chars, uppercase)
  name: string; // Human-readable name
}

export interface User {
  id: string;
  twitter_id: string;
  twitter_handle: string;
  twitter_name: string;
  avatar_url: string;
  bio?: string;
  country?: string; // @deprecated Use country_code instead
  country_code?: string; // ISO 3166-1 alpha-2 (e.g., "US", "RU")
  city?: string; // Max 150 characters
  role?: UserRole;
  is_open_to_meet: boolean;
  subscription_tier: SubscriptionTier;
  is_verified: boolean;
  wallet_address?: string;
  socials?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  mutual_followers_count?: number;
  mutual_followers?: User[];
  events_attended?: Event[];
  events_upcoming?: Event[];
}

// Event types
export type EventType = "official" | "community" | "private" | "meetup";
export type EventVisibility = "public" | "vip_only";

export interface Event {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  country: string;
  city: string;
  address?: string;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date?: string;
  event_type: EventType;
  visibility: EventVisibility;
  is_paid: boolean;
  price_sol?: number;
  max_attendees?: number;
  attendees_count: number;
  socials?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
  };
  organizer_id?: string;
  created_at: string;
}

// Hub types
export interface Hub {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  country: string;
  city?: string;
  latitude: number;
  longitude: number;
  members_count: number;
  socials?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
  };
  created_at: string;
}

// Map types
export interface MapMarker {
  id: string;
  type: "user" | "vip_user" | "event" | "hub";
  latitude: number;
  longitude: number;
  data: User | Event | Hub;
}

export interface CountryStats {
  country_code: string; // ISO 3166-1 alpha-2
  country_name?: string; // Human-readable name from countries table
  users_count: number;
  vip_users_count: number;
  events_count?: number;
  hubs_count?: number;
}

// Filter types
export interface MapFilters {
  showUsers: boolean;
  showEvents: boolean;
  showHubs: boolean;
  userRoles?: UserRole[];
  openToMeet?: boolean;
  activeOnly?: boolean;
  country?: string;
  city?: string;
}

// Message types
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant: User;
  last_message?: Message;
  unread_count: number;
}

// Auth types
export interface AuthUser {
  id: string;
  twitter_id: string;
  twitter_handle: string;
  twitter_name: string;
  avatar_url: string;
  subscription_tier: SubscriptionTier;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Geolocation types
export interface GeoLocation {
  country?: string; // @deprecated Use country_name instead
  country_code: string; // ISO 3166-1 alpha-2
  country_name?: string; // Human-readable name
  city?: string; // Max 150 characters
  latitude: number;
  longitude: number;
}

// Invite types
export interface Invite {
  id: string;
  code: string;
  inviter_user_id: string;
  max_uses?: number | null;
  expires_at?: string | null;
  created_at: string;
  uses_count?: number; // Количество использований (добавляется на сервере)
}

export interface Referral {
  id: string;
  invite_id: string;
  inviter_user_id: string;
  invited_user_id: string;
  created_at: string;
}

