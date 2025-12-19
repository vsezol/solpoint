import type { Event } from "@/types";

export interface EventFilters {
  search?: string;
  event_type?: "official" | "community" | "private" | "meetup";
  country?: string;
  country_code?: string;
  city?: string;
  visibility?: "public" | "vip_only";
  is_online?: boolean;
  is_paid?: boolean;
  upcoming?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetEventsResponse {
  events: Event[];
  error?: string;
}

/**
 * Получить список событий с фильтрацией
 */
export async function getEvents(filters: EventFilters = {}): Promise<Event[]> {
  try {
    const params = new URLSearchParams();

    if (filters.event_type) {
      params.append("event_type", filters.event_type);
    }

    if (filters.country) {
      params.append("country", filters.country);
    }

    if (filters.country_code) {
      params.append("country_code", filters.country_code);
    }

    if (filters.city) {
      params.append("city", filters.city);
    }

    if (filters.visibility) {
      params.append("visibility", filters.visibility);
    }

    if (filters.is_online !== undefined) {
      params.append("is_online", String(filters.is_online));
    }

    if (filters.is_paid !== undefined) {
      params.append("is_paid", String(filters.is_paid));
    }

    if (filters.upcoming) {
      params.append("upcoming", "true");
    }

    if (filters.limit) {
      params.append("limit", String(filters.limit));
    }

    if (filters.offset) {
      params.append("offset", String(filters.offset));
    }

    const response = await fetch(`/api/events?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching events:", errorData);
      return [];
    }

    const data: GetEventsResponse = await response.json();
    return data.events || [];
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

/**
 * Получить событие по ID
 */
export async function getEventById(eventId: string): Promise<Event | null> {
  try {
    const response = await fetch(`/api/events/${eventId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching event:", errorData);
      return null;
    }

    const data = await response.json();
    return data.event || null;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

/**
 * Получить событие по slug
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  try {
    const response = await fetch(`/api/events/slug/${slug}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching event by slug:", errorData);
      return null;
    }

    const data = await response.json();
    return data.event || null;
  } catch (error) {
    console.error("Error fetching event by slug:", error);
    return null;
  }
}

/**
 * Создать новое событие
 */
export async function createEvent(eventData: Partial<Event>): Promise<Event | null> {
  try {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error creating event:", errorData);
      throw new Error(errorData.error || "Failed to create event");
    }

    const data = await response.json();
    return data.event || null;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

/**
 * Фильтрация событий на клиенте по поисковому запросу
 * (используется для поиска по имени, городу, стране)
 */
export function filterEventsBySearch(events: Event[], searchQuery: string): Event[] {
  if (!searchQuery.trim()) {
    return events;
  }

  const query = searchQuery.toLowerCase();
  return events.filter((event) => {
    const nameMatch = event.name.toLowerCase().includes(query);
    const cityMatch = event.city?.toLowerCase().includes(query);
    const countryMatch = event.country?.toLowerCase().includes(query);
    const descriptionMatch = event.description?.toLowerCase().includes(query);

    return nameMatch || cityMatch || countryMatch || descriptionMatch;
  });
}


