import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/dashboard/has-entities
 * Проверяет, есть ли у пользователя хотя бы одна сущность (event, hub, community, project, workspace)
 * Легкий endpoint для проверки наличия сущностей на фронтенде
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ hasEntities: false });
  }

  const userId = authUser.id;

  // Проверяем наличие хотя бы одной сущности параллельно
  // Используем простой SELECT с limit(1) для максимальной производительности
  const [
    { data: eventsData },
    { data: hubsData },
    { data: communitiesData },
    { data: projectsData },
    { data: workspacesData },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id")
      .eq("owner_type", "user")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("hubs")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("communities")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle(),
  ]);

  const hasEntities =
    !!eventsData ||
    !!hubsData ||
    !!communitiesData ||
    !!projectsData ||
    !!workspacesData;

  return NextResponse.json({ hasEntities });
}

