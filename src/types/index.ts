// User types
export type UserRole = "degen" | "developer" | "trader" | "investor" | "designer" | "founder" | "other";
export type SubscriptionTier = "free" | "vip";

export interface User {
  id: string;
  twitter_id: string;
  twitter_handle: string;
  twitter_name: string;
  avatar_url: string;
  bio?: string;
  country: string;
  city?: string;
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
  country: string;
  country_code: string;
  users_count: number;
  events_count: number;
  hubs_count: number;
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
  country: string;
  country_code: string;
  city: string;
  latitude: number;
  longitude: number;
}

