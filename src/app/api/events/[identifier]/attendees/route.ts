import { createClient } from "@/lib/supabase/server";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/events/[identifier]/attendees
 * Получение полного списка участников события (работает с ID или slug)
 * Требует PRO подписки
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const { identifier } = await params;
  const supabase = await createClient();
  
  // Преобразуем identifier в ID
  const eventId = await getEntityIdByIdentifier("event", identifier);
  if (!eventId) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 }
    );
  }

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Проверяем PRO подписку
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", authUser.id)
    .single();

  if (profile?.subscription_tier !== "vip") {
    return NextResponse.json(
      { error: "PRO subscription required" },
      { status: 403 }
    );
  }

  // Получаем всех участников
  const { data: members, error } = await supabase
    .from("event_attendees")
    .select(`
      *,
      user:profiles!event_attendees_user_id_fkey(
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
        updated_at,
        countries!fk_profiles_country_code (
          name
        )
      )
    `)
    .eq("event_id", eventId)
    .order("registered_at", { ascending: false });

  if (error) {
    console.error("Error fetching event attendees:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendees" },
      { status: 500 }
    );
  }

  // Форматируем данные для ответа
  const items = (members || [])
    .filter((m) => m.user)
    .map((m) => {
      const user = m.user as any;
      const countryName = Array.isArray(user.countries)
        ? user.countries[0]?.name
        : (user.countries as { name: string } | null | undefined)?.name;

      return {
        id: user.id,
        avatar_url: user.avatar_url,
        name: user.twitter_name,
        twitter_handle: user.twitter_handle,
        isVip: user.subscription_tier === "vip",
        isVerified: user.is_verified,
      };
    });

  return NextResponse.json({ items }, { status: 200 });
}

