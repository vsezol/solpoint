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

