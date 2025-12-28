import { createClient } from "@/lib/supabase/server";
import { isUUID } from "@/lib/utils";

/**
 * Получает ID сущности (community, event, hub, project, workspace) из identifier (UUID или slug)
 * @param entityType Тип сущности: 'community' | 'event' | 'hub' | 'project' | 'workspace'
 * @param identifier UUID или slug
 * @returns ID сущности или null, если не найдено
 */
export async function getEntityIdByIdentifier(
  entityType: "community" | "event" | "hub" | "project" | "workspace",
  identifier: string
): Promise<string | null> {
  const supabase = await createClient();

  const tableMap: Record<typeof entityType, string> = {
    community: "communities",
    event: "events",
    hub: "hubs",
    project: "projects",
    workspace: "workspaces",
  };

  // Если это UUID, проверяем, существует ли сущность с таким ID
  if (isUUID(identifier)) {
    const { data, error } = await supabase
      .from(tableMap[entityType])
      .select("id")
      .eq("id", identifier)
      .single();

    if (error || !data) {
      return null;
    }

    return data.id;
  }

  // Если это slug, получаем ID из базы данных

  const { data, error } = await supabase
    .from(tableMap[entityType])
    .select("id")
    .eq("slug", identifier)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

