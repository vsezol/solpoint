import { createClient } from "@/lib/supabase/server";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/hubs/[slug]/members
 * Получение полного списка участников хаба
 * Требует PRO подписки
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const { identifier } = await params;
  // Преобразуем identifier в ID
  
  const hubId = await getEntityIdByIdentifier("hub", identifier);
  if (!hubId) {
    return NextResponse.json(
      { error: "Hub not found" },
      { status: 404 }
    );
  }
  const supabase = await createClient();

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

  // Получаем хаб по slug
  const { data: hub, error: hubError } = await supabase
    .from("hubs")
    .select("id")
    .eq("id", hubId)
    .single();

  if (hubError || !hub) {
    return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  }

  // Получаем всех участников хаба
  const { data: members, error } = await supabase
    .from("hub_members")
    .select(`
      *,
      user:profiles!hub_members_user_id_fkey(
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
        socials,
        last_active_at,
        created_at,
        updated_at,
        countries!fk_profiles_country_code (
          name
        )
      )
    `)
    .eq("hub_id", hubId)
    .order("joined_at", { ascending: false });

  if (error) {
    console.error("Error fetching hub members:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch members" },
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

