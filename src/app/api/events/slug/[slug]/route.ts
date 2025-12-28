import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/events/slug/[slug]
 * Получение деталей ивента по публичной ссылке (slug)
 * Публичный эндпоинт - не требует аутентификации для просмотра
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient();
  const { slug } = await params;

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

  // Получаем ивент по slug с связанными данными
  const { data: event, error } = await supabase
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
    `)
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    console.error("Error fetching event by slug:", error);
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



