import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isUUID } from "@/lib/utils";

/**
 * GET /api/events/[identifier]
 * Получение деталей ивента по публичной ссылке (slug) или ID
 * Публичный эндпоинт - не требует аутентификации для просмотра
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const { identifier } = await params;
  const supabase = await createClient();

  // Проверяем аутентификацию для VIP ивентов
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let isVip = false;
  if (authUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", authUser.id)
      .single();
    isVip = profile?.subscription_tier === "vip";
  }

  // Определяем, является ли identifier UUID или slug
  let query = supabase
    .from("events")
    .select(`
      *,
      owner_user:profiles!events_owner_id_fkey(
        id,
        twitter_handle,
        twitter_name,
        avatar_url,
        bio,
        country,
        city
      ),
      owner_hub:hubs!events_owner_id_fkey(
        id,
        name,
        description,
        image_url,
        country,
        city
      ),
      owner_community:communities!events_owner_id_fkey(
        id,
        name,
        description,
        image_url,
        country,
        city
      ),
      owner_project:projects!events_owner_id_fkey(
        id,
        name,
        description,
        image_url,
        country,
        city
      ),
      owner_workspace:workspaces!events_owner_id_fkey(
        id,
        name,
        description,
        image_url,
        country,
        city,
        address
      )
    `);

  // Используем ID или slug в зависимости от типа identifier
  if (isUUID(identifier)) {
    query = query.eq("id", identifier);
  } else {
    query = query.eq("slug", identifier);
  }

  const { data: event, error } = await query.single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch event" },
      { status: 500 }
    );
  }

  // Проверяем доступ к VIP ивенту
  if (event.visibility === "vip_only" && !isVip) {
    return NextResponse.json(
      { error: "This event is PRO only" },
      { status: 403 }
    );
  }

  return NextResponse.json({ event }, { status: 200 });
}

