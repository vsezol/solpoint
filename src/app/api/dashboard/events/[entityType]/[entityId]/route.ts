import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/dashboard/events/[entityType]/[entityId]
 * Получает события конкретной сущности, принадлежащей текущему пользователю
 * Безопасный endpoint - проверяет права доступа на бэкенде
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  const supabase = await createClient();
  const { entityType, entityId } = await params;

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Валидация типа сущности
  const validEntityTypes = ["hub", "community", "project", "workspace"];
  if (!validEntityTypes.includes(entityType)) {
    return NextResponse.json(
      { error: "Invalid entity type" },
      { status: 400 }
    );
  }

  try {
    // Проверяем, что сущность существует и принадлежит пользователю
    let tableName: string;
    switch (entityType) {
      case "hub":
        tableName = "hubs";
        break;
      case "community":
        tableName = "communities";
        break;
      case "project":
        tableName = "projects";
        break;
      case "workspace":
        tableName = "workspaces";
        break;
      default:
        return NextResponse.json(
          { error: "Invalid entity type" },
          { status: 400 }
        );
    }

    const { data: entity, error: entityError } = await supabase
      .from(tableName)
      .select("owner_id")
      .eq("id", entityId)
      .single();

    if (entityError || !entity) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    // Проверяем права доступа
    if (entity.owner_id !== authUser.id) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this entity" },
        { status: 403 }
      );
    }

    // Получаем события, принадлежащие этой сущности
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .eq("owner_type", entityType)
      .eq("owner_id", entityId)
      .order("created_at", { ascending: false });

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      return NextResponse.json(
        { error: eventsError.message || "Failed to fetch events" },
        { status: 500 }
      );
    }

    return NextResponse.json({ events: events || [] }, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

