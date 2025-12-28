import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/dashboard/events
 * Получает события текущего авторизованного пользователя
 * Безопасный endpoint - автоматически фильтрует по владельцу на бэкенде
 */
export async function GET() {
  const supabase = await createClient();

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Получаем события, где owner_type = 'user' AND owner_id = userId
    const { data: userOwnedEvents, error: userEventsError } = await supabase
      .from("events")
      .select("*")
      .eq("owner_type", "user")
      .eq("owner_id", authUser.id)
      .order("created_at", { ascending: false });

    if (userEventsError) {
      console.error("Error fetching user owned events:", userEventsError);
    }

    // 2. Получаем все сущности пользователя
    const [hubsResult, projectsResult, communitiesResult, workspacesResult] = await Promise.all([
      supabase
        .from("hubs")
        .select("id")
        .eq("owner_id", authUser.id),
      supabase
        .from("projects")
        .select("id")
        .eq("owner_id", authUser.id),
      supabase
        .from("communities")
        .select("id")
        .eq("owner_id", authUser.id),
      supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", authUser.id),
    ]);

    const hubs = hubsResult.data || [];
    const projects = projectsResult.data || [];
    const communities = communitiesResult.data || [];
    const workspaces = workspacesResult.data || [];

    // 3. Получаем события, принадлежащие сущностям пользователя
    const entityOwnedEvents: any[] = [];

    if (hubs.length > 0) {
      const { data: hubEvents } = await supabase
        .from("events")
        .select("*")
        .eq("owner_type", "hub")
        .in("owner_id", hubs.map((h) => h.id))
        .order("created_at", { ascending: false });
      if (hubEvents) entityOwnedEvents.push(...hubEvents);
    }

    if (projects.length > 0) {
      const { data: projectEvents } = await supabase
        .from("events")
        .select("*")
        .eq("owner_type", "project")
        .in("owner_id", projects.map((p) => p.id))
        .order("created_at", { ascending: false });
      if (projectEvents) entityOwnedEvents.push(...projectEvents);
    }

    if (communities.length > 0) {
      const { data: communityEvents } = await supabase
        .from("events")
        .select("*")
        .eq("owner_type", "community")
        .in("owner_id", communities.map((c) => c.id))
        .order("created_at", { ascending: false });
      if (communityEvents) entityOwnedEvents.push(...communityEvents);
    }

    if (workspaces.length > 0) {
      const { data: workspaceEvents } = await supabase
        .from("events")
        .select("*")
        .eq("owner_type", "workspace")
        .in("owner_id", workspaces.map((w) => w.id))
        .order("created_at", { ascending: false });
      if (workspaceEvents) entityOwnedEvents.push(...workspaceEvents);
    }

    // Объединяем все события пользователя
    const allEvents = [...(userOwnedEvents || []), ...entityOwnedEvents];

    return NextResponse.json({ events: allEvents }, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

