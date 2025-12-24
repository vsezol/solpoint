import type { Workspace } from "@/types";

interface WorkspaceFilters {
  country?: string;
  country_code?: string;
  city?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Получить список workspaces с фильтрами через API
 */
export async function getWorkspaces(
  filters: WorkspaceFilters = {}
): Promise<Workspace[]> {
  try {
    const params = new URLSearchParams();

    if (filters.country_code) {
      params.append("country_code", filters.country_code.toUpperCase());
    } else if (filters.country) {
      params.append("country", filters.country);
    }

    if (filters.city) {
      params.append("city", filters.city);
    }

    if (filters.search) {
      params.append("search", filters.search);
    }

    if (filters.limit) {
      params.append("limit", filters.limit.toString());
    }

    if (filters.offset) {
      params.append("offset", filters.offset.toString());
    }

    const response = await fetch(`/api/workspaces?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Get workspaces error:", response.status);
      return [];
    }

    const { workspaces } = await response.json();
    return workspaces || [];
  } catch (error) {
    console.error("Get workspaces error:", error);
    return [];
  }
}

/**
 * Создать новый workspace
 */
export async function createWorkspace(data: {
  name: string;
  description?: string;
  image_url?: string;
  slug?: string;
  country?: string;
  country_code?: string;
  city?: string;
  address: string; // Обязательно для workspace
  latitude: number;
  longitude: number;
  socials?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
  };
}): Promise<Workspace | null> {
  try {
    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error creating workspace:", errorData);
      throw new Error(errorData.error || "Failed to create workspace");
    }

    const result = await response.json();
    return result.workspace || null;
  } catch (error) {
    console.error("Error creating workspace:", error);
    throw error;
  }
}

