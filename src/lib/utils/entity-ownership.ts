import { createClient } from "@/lib/supabase/server";

/**
 * Проверяет, является ли пользователь владельцем события
 * Учитывает, что owner может быть user, hub, community, project или workspace
 */
export async function isEventOwner(
  eventId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  
  const { data: event, error } = await supabase
    .from("events")
    .select("owner_type, owner_id")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    return false;
  }

  // Если owner - пользователь
  if (event.owner_type === "user" && event.owner_id === userId) {
    return true;
  }

  // Если owner - сущность, проверяем является ли пользователь владельцем этой сущности
  if (event.owner_type === "hub") {
    const { data: hub } = await supabase
      .from("hubs")
      .select("owner_id")
      .eq("id", event.owner_id)
      .single();
    
    return hub?.owner_id === userId;
  }

  if (event.owner_type === "community") {
    const { data: community } = await supabase
      .from("communities")
      .select("owner_id")
      .eq("id", event.owner_id)
      .single();
    
    return community?.owner_id === userId;
  }

  if (event.owner_type === "project") {
    const { data: project } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", event.owner_id)
      .single();
    
    return project?.owner_id === userId;
  }

  if (event.owner_type === "workspace") {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", event.owner_id)
      .single();
    
    return workspace?.owner_id === userId;
  }

  return false;
}

/**
 * Проверяет, является ли пользователь владельцем сущности (hub, community, project, workspace)
 */
export async function isEntityOwner(
  entityType: "hub" | "community" | "project" | "workspace",
  entityId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  
  const tableName = entityType === "hub" ? "hubs" : entityType === "workspace" ? "workspaces" : `${entityType}s`;
  
  const { data: entity, error } = await supabase
    .from(tableName)
    .select("owner_id")
    .eq("id", entityId)
    .single();

  if (error || !entity) {
    return false;
  }

  return entity.owner_id === userId;
}

/**
 * Получает owner_id события (для обратной совместимости)
 * Если owner_type = 'user', возвращает owner_id
 * Иначе возвращает owner_id сущности-владельца
 */
export async function getEventOwnerUserId(eventId: string): Promise<string | null> {
  const supabase = await createClient();
  
  const { data: event, error } = await supabase
    .from("events")
    .select("owner_type, owner_id")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    return null;
  }

  // Если owner - пользователь
  if (event.owner_type === "user") {
    return event.owner_id;
  }

  // Если owner - сущность, получаем owner_id этой сущности
  if (event.owner_type === "hub") {
    const { data: hub } = await supabase
      .from("hubs")
      .select("owner_id")
      .eq("id", event.owner_id)
      .single();
    
    return hub?.owner_id || null;
  }

  if (event.owner_type === "community") {
    const { data: community } = await supabase
      .from("communities")
      .select("owner_id")
      .eq("id", event.owner_id)
      .single();
    
    return community?.owner_id || null;
  }

  if (event.owner_type === "project") {
    const { data: project } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", event.owner_id)
      .single();
    
    return project?.owner_id || null;
  }

  if (event.owner_type === "workspace") {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", event.owner_id)
      .single();
    
    return workspace?.owner_id || null;
  }

  return null;
}

