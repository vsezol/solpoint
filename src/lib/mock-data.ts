import type { User, Event, Hub, MapMarker } from "@/types";

// Mock users
export const mockUsers: User[] = [
  {
    id: "1",
    twitter_id: "123456789",
    twitter_handle: "solana_alex",
    twitter_name: "Alex Scott",
    avatar_url: "https://pbs.twimg.com/profile_images/1234567890/avatar.jpg",
    bio: "Marketer with 5 years of experience, worked in @SignalXDAO, open for any opportunities.",
    country: "Argentina",
    country_code: "AR",
    city: "Buenos Aires",
    role: "trader",
    is_open_to_meet: true,
    subscription_tier: "vip",
    is_verified: true,
    socials: {
      twitter: "@solana_alex",
      instagram: "https://instagram.com/solana_alex",
    },
    last_active_at: new Date().toISOString(),
    created_at: "2024-01-15T00:00:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    twitter_id: "987654321",
    twitter_handle: "cryptodev_eth",
    twitter_name: "CryptoDev",
    avatar_url: "",
    bio: "Building on Solana. DM for collabs.",
    country: "Kazakhstan",
    country_code: "KZ",
    city: "Almaty",
    role: "developer",
    is_open_to_meet: true,
    subscription_tier: "free",
    is_verified: false,
    socials: {
      twitter: "@cryptodev_eth",
    },
    last_active_at: new Date().toISOString(),
    created_at: "2024-02-20T00:00:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    twitter_id: "111222333",
    twitter_handle: "sol_investor",
    twitter_name: "Sol Investor",
    avatar_url: "",
    bio: "Early stage investor in Solana ecosystem projects.",
    country: "UAE",
    country_code: "AE",
    city: "Dubai",
    role: "investor",
    is_open_to_meet: false,
    subscription_tier: "vip",
    is_verified: true,
    socials: {
      twitter: "@sol_investor",
    },
    last_active_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: "2024-03-01T00:00:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    twitter_id: "444555666",
    twitter_handle: "degen_trader",
    twitter_name: "Degen Trader",
    avatar_url: "",
    bio: "Full time degen. WAGMI.",
    country: "Turkey",
    country_code: "TR",
    city: "Istanbul",
    role: "degen",
    is_open_to_meet: true,
    subscription_tier: "free",
    is_verified: false,
    socials: {
      twitter: "@degen_trader",
    },
    last_active_at: new Date().toISOString(),
    created_at: "2024-01-01T00:00:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: "5",
    twitter_id: "777888999",
    twitter_handle: "sol_designer",
    twitter_name: "Sol Designer",
    avatar_url: "",
    bio: "UI/UX designer passionate about Web3.",
    country: "Thailand",
    country_code: "TH",
    city: "Bangkok",
    role: "designer",
    is_open_to_meet: true,
    subscription_tier: "vip",
    is_verified: false,
    socials: {
      twitter: "@sol_designer",
    },
    last_active_at: new Date().toISOString(),
    created_at: "2024-04-10T00:00:00Z",
    updated_at: new Date().toISOString(),
  },
];

// Mock events
export const mockEvents: Event[] = [
  {
    id: "e1",
    name: "Breakpoint 2025",
    description: "The premier Solana conference bringing together builders, investors, and enthusiasts from around the world.",
    image_url: "",
    country: "UAE",
    city: "Abu Dhabi",
    latitude: 24.4539,
    longitude: 54.3773,
    start_date: "2025-12-11T00:00:00Z",
    end_date: "2025-12-13T00:00:00Z",
    event_type: "official",
    visibility: "public",
    is_paid: true,
    price_sol: 2,
    max_attendees: 5000,
    attendees_count: 3000,
    socials: {
      twitter: "https://twitter.com/solana",
      instagram: "https://instagram.com/solana",
      website: "https://breakpoint.solana.com",
    },
    created_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "e2",
    name: "Solana Hacker House Almaty",
    description: "Week-long hacking event for Solana builders in Central Asia.",
    image_url: "",
    country: "Kazakhstan",
    city: "Almaty",
    latitude: 43.2220,
    longitude: 76.8512,
    start_date: "2025-03-15T00:00:00Z",
    end_date: "2025-03-22T00:00:00Z",
    event_type: "official",
    visibility: "public",
    is_paid: true,
    price_sol: 4,
    attendees_count: 150,
    socials: {
      twitter: "https://twitter.com/superteamkz",
      instagram: "https://instagram.com/superteamkz",
    },
    created_at: "2024-12-01T00:00:00Z",
  },
  {
    id: "e3",
    name: "Istanbul Solana Meetup",
    description: "Monthly community meetup in Istanbul.",
    image_url: "",
    country: "Turkey",
    city: "Istanbul",
    latitude: 41.0082,
    longitude: 28.9784,
    start_date: "2025-02-20T18:00:00Z",
    event_type: "meetup",
    visibility: "public",
    is_paid: false,
    attendees_count: 45,
    socials: {
      twitter: "https://twitter.com/solana_istanbul",
      instagram: "https://instagram.com/solana_istanbul",
    },
    created_at: "2025-01-15T00:00:00Z",
  },
  {
    id: "e4",
    name: "VIP Networking Dinner",
    description: "Exclusive dinner for Solana VIPs in Dubai.",
    image_url: "",
    country: "UAE",
    city: "Dubai",
    latitude: 25.2048,
    longitude: 55.2708,
    start_date: "2025-02-28T19:00:00Z",
    event_type: "private",
    visibility: "vip_only",
    is_paid: true,
    price_sol: 5,
    max_attendees: 30,
    attendees_count: 25,
    socials: {},
    created_at: "2025-01-20T00:00:00Z",
  },
];

// Mock hubs
export const mockHubs: Hub[] = [
  {
    id: "h1",
    name: "Superteam KZ",
    description: "Superteam is a global, decentralized network of top builders, investors, and developers focused on accelerating the growth and adoption of the Solana ecosystem.",
    image_url: "",
    country: "Kazakhstan",
    city: "Almaty",
    latitude: 43.2566,
    longitude: 76.9286,
    members_count: 250,
    socials: {
      twitter: "https://twitter.com/superteamkz",
      website: "https://superteam.fun",
    },
    created_at: "2023-06-01T00:00:00Z",
  },
  {
    id: "h2",
    name: "Superteam Turkey",
    description: "Building the Solana ecosystem in Turkey.",
    image_url: "",
    country: "Turkey",
    latitude: 39.9334,
    longitude: 32.8597,
    members_count: 180,
    socials: {
      twitter: "https://twitter.com/superteamtr",
    },
    created_at: "2023-08-15T00:00:00Z",
  },
  {
    id: "h3",
    name: "Superteam UAE",
    description: "Solana builders community in UAE.",
    image_url: "",
    country: "UAE",
    city: "Dubai",
    latitude: 25.0657,
    longitude: 55.1713,
    members_count: 320,
    socials: {
      twitter: "https://twitter.com/superteamuae",
    },
    created_at: "2023-04-01T00:00:00Z",
  },
  {
    id: "h4",
    name: "Superteam India",
    description: "India's largest Solana community.",
    image_url: "",
    country: "India",
    city: "Bangalore",
    latitude: 12.9716,
    longitude: 77.5946,
    members_count: 850,
    socials: {
      twitter: "https://twitter.com/superteamin",
    },
    created_at: "2022-12-01T00:00:00Z",
  },
];

// Helper to create map markers
export function createMapMarkers(
  users: User[],
  events: Event[],
  hubs: Hub[]
): MapMarker[] {
  const markers: MapMarker[] = [];

  // Add user markers (random positions around their country/city)
  const countryCoordinates: Record<string, { lat: number; lng: number }> = {
    "Argentina": { lat: -34.6037, lng: -58.3816 },
    "Kazakhstan": { lat: 43.2566, lng: 76.9286 },
    "UAE": { lat: 25.2048, lng: 55.2708 },
    "Turkey": { lat: 41.0082, lng: 28.9784 },
    "Thailand": { lat: 13.7563, lng: 100.5018 },
    "India": { lat: 12.9716, lng: 77.5946 },
  };

  users.forEach((user) => {
    const coords = countryCoordinates[user.country] || { lat: 0, lng: 0 };
    // Add small random offset
    const latOffset = (Math.random() - 0.5) * 2;
    const lngOffset = (Math.random() - 0.5) * 2;

    markers.push({
      id: `user-${user.id}`,
      type: user.subscription_tier === "pro" ? "pro_user" : "user",
      latitude: coords.lat + latOffset,
      longitude: coords.lng + lngOffset,
      data: user,
    });
  });

  // Add event markers
  events.forEach((event) => {
    markers.push({
      id: `event-${event.id}`,
      type: "event",
      latitude: event.latitude,
      longitude: event.longitude,
      data: event,
    });
  });

  // Add hub markers
  hubs.forEach((hub) => {
    markers.push({
      id: `hub-${hub.id}`,
      type: "hub",
      latitude: hub.latitude,
      longitude: hub.longitude,
      data: hub,
    });
  });

  return markers;
}

// Get mock markers
export function getMockMarkers(): MapMarker[] {
  return createMapMarkers(mockUsers, mockEvents, mockHubs);
}

