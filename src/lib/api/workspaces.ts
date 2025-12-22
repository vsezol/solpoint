import { createClient } from "@/lib/supabase/client";
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
 * Получить список workspaces с фильтрами
 */
export async function getWorkspaces(
  filters: WorkspaceFilters = {}
): Promise<Workspace[]> {
  const supabase = createClient();
  
  let query = supabase
    .from("workspaces")
    .select("*")
    .order("members_count", { ascending: false });

  if (filters.country_code) {
    query = query.eq("country_code", filters.country_code.toUpperCase());
  } else if (filters.country) {
    query = query.eq("country", filters.country);
  }

  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
  }

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,country.ilike.%${filters.search}%,city.ilike.%${filters.search}%,description.ilike.%${filters.search}%,address.ilike.%${filters.search}%`
    );
  }

  const limit = filters.limit || 500;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("Get workspaces error:", error);
    return [];
  }

  return data || [];
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

