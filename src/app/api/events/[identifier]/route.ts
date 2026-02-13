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

  // Load organizers from event_organizers (internal = profiles, external = luma_users)
  const eventId = event.id;
  const { data: organizerRows } = await supabase
    .from("event_organizers")
    .select(`
      id,
      profile_id,
      luma_user_id,
      position,
      profile:profiles!event_organizers_profile_id_fkey(
        id,
        twitter_id,
        twitter_handle,
        twitter_name,
        avatar_url,
        bio,
        country,
        country_code,
        city,
        role,
        is_open_to_meet,
        subscription_tier,
        is_verified,
        wallet_address,
        socials,
        last_active_at,
        created_at,
        updated_at
      ),
      luma_user:luma_users!event_organizers_luma_user_id_fkey(
        id,
        luma_profile_url,
        name,
        avatar,
        social_links
      )
    `)
    .eq("event_id", eventId)
    .order("position", { ascending: true });

  type ProfileRow = {
    id: string;
    twitter_id: string;
    twitter_handle: string;
    twitter_name: string;
    avatar_url: string;
    bio?: string;
    country?: string;
    country_code?: string;
    city?: string;
    role?: string;
    is_open_to_meet?: boolean;
    subscription_tier?: string;
    is_verified?: boolean;
    wallet_address?: string;
    socials?: unknown;
    last_active_at?: string;
    created_at?: string;
    updated_at?: string;
  };
  type LumaUserRow = {
    id: string;
    luma_profile_url: string;
    name: string | null;
    avatar: string | null;
    social_links: unknown;
  };
  const internal: ProfileRow[] = [];
  const external: { id: string; name: string | null; avatar: string | null; profile_url: string; social_links: Record<string, string> }[] = [];
  if (organizerRows) {
    for (const row of organizerRows as Array<{
      profile_id: string | null;
      luma_user_id: string | null;
      profile: ProfileRow | ProfileRow[] | null;
      luma_user: LumaUserRow | LumaUserRow[] | null;
    }>) {
      if (row.profile_id && row.profile) {
        const p = Array.isArray(row.profile) ? row.profile[0] : row.profile;
        if (p) internal.push(p);
      }
      if (row.luma_user_id && row.luma_user) {
        const u = Array.isArray(row.luma_user) ? row.luma_user[0] : row.luma_user;
        if (u)
          external.push({
            id: u.id,
            name: u.name ?? null,
            avatar: u.avatar ?? null,
            profile_url: u.luma_profile_url ?? "",
            social_links: (u.social_links as Record<string, string>) ?? {},
          });
      }
    }
  }

  const eventWithSource = {
    ...event,
    source: event.luma_event_id ? ("external" as const) : ("solpoint" as const),
    organizers: { internal, external },
  };

  return NextResponse.json({ event: eventWithSource }, { status: 200 });
}

