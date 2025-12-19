import type { Community } from "@/types";

export interface CommunityFilters {
  search?: string;
  country?: string;
  country_code?: string;
  city?: string;
  limit?: number;
  offset?: number;
}

export interface GetCommunitiesResponse {
  communities: Community[];
  error?: string;
}

/**
 * Получить список комьюнити с фильтрацией
 */
export async function getCommunities(
  filters: CommunityFilters = {}
): Promise<Community[]> {
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

    const response = await fetch(`/api/communities?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching communities:", errorData);
      return [];
    }

    const data: GetCommunitiesResponse = await response.json();
    return data.communities || [];
  } catch (error) {
    console.error("Error fetching communities:", error);
    return [];
  }
}

/**
 * Получить комьюнити по ID
 */
export async function getCommunityById(
  communityId: string
): Promise<Community | null> {
  try {
    const response = await fetch(`/api/communities/${communityId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching community:", errorData);
      return null;
    }

    const data = await response.json();
    return data.community || null;
  } catch (error) {
    console.error("Error fetching community:", error);
    return null;
  }
}

/**
 * Получить комьюнити по slug
 */
export async function getCommunityBySlug(
  slug: string
): Promise<Community | null> {
  try {
    const response = await fetch(`/api/communities/slug/${slug}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching community by slug:", errorData);
      return null;
    }

    const data = await response.json();
    return data.community || null;
  } catch (error) {
    console.error("Error fetching community by slug:", error);
    return null;
  }
}

/**
 * Создать новое комьюнити
 */
export async function createCommunity(
  communityData: Partial<Community>
): Promise<Community | null> {
  try {
    const response = await fetch("/api/communities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(communityData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error creating community:", errorData);
      throw new Error(errorData.error || "Failed to create community");
    }

    const data = await response.json();
    return data.community || null;
  } catch (error) {
    console.error("Error creating community:", error);
    throw error;
  }
}

