import type { Hub } from "@/types";

export interface HubFilters {
  search?: string;
  country?: string;
  country_code?: string;
  city?: string;
  limit?: number;
  offset?: number;
}

export interface GetHubsResponse {
  hubs: Hub[];
  error?: string;
}

/**
 * Получить список хабов с фильтрацией
 */
export async function getHubs(filters: HubFilters = {}): Promise<Hub[]> {
  try {
    const params = new URLSearchParams();

    if (filters.search) {
      params.append("search", filters.search);
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

    if (filters.limit) {
      params.append("limit", String(filters.limit));
    }

    if (filters.offset) {
      params.append("offset", String(filters.offset));
    }

    const response = await fetch(`/api/hubs?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching hubs:", errorData);
      return [];
    }

    const data: GetHubsResponse = await response.json();
    return data.hubs || [];
  } catch (error) {
    console.error("Error fetching hubs:", error);
    return [];
  }
}

/**
 * Получить хаб по ID
 */
export async function getHubById(hubId: string): Promise<Hub | null> {
  try {
    const response = await fetch(`/api/hubs/${hubId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching hub:", errorData);
      return null;
    }

    const data = await response.json();
    return data.hub || null;
  } catch (error) {
    console.error("Error fetching hub:", error);
    return null;
  }
}

/**
 * Получить хаб по slug
 */
export async function getHubBySlug(slug: string): Promise<Hub | null> {
  try {
    const response = await fetch(`/api/hubs/slug/${slug}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching hub by slug:", errorData);
      return null;
    }

    const data = await response.json();
    return data.hub || null;
  } catch (error) {
    console.error("Error fetching hub by slug:", error);
    return null;
  }
}

