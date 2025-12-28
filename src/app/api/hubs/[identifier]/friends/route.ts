import { createClient } from "@/lib/supabase/server";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/hubs/[slug]/friends
 * Получение полного списка друзей, которые являются участниками хаба
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

  // Получаем всех участников хаба
  const { data: members, error: membersError } = await supabase
    .from("hub_members")
    .select("user_id")
    .eq("hub_id", hubId);

  if (membersError) {
    console.error("Error fetching hub members:", membersError);
    return NextResponse.json(
      { error: membersError.message || "Failed to fetch members" },
      { status: 500 }
    );
  }

  const memberUserIds = new Set((members || []).map((m) => m.user_id));

  // Получаем взаимных друзей авторизованного пользователя
  const { data: mutualFriendsData } = await supabase
    .from("mutual_friends")
    .select("user_id, friend_id")
    .or(`user_id.eq.${authUser.id},friend_id.eq.${authUser.id}`);

  // Получаем ID всех друзей
  const friendIds: string[] = [];
  if (mutualFriendsData) {
    for (const mf of mutualFriendsData) {
      if (mf.user_id === authUser.id) {
        friendIds.push(mf.friend_id);
      } else if (mf.friend_id === authUser.id) {
        friendIds.push(mf.user_id);
      }
    }
  }

  // Находим друзей, которые являются участниками хаба
  const friendsGoingIds = friendIds.filter((id) => memberUserIds.has(id));

  if (friendsGoingIds.length === 0) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  // Загружаем профили друзей, которые являются участниками хаба
  const { data: friendsProfiles, error: friendsError } = await supabase
    .from("profiles")
    .select(`
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
    `)
    .in("id", friendsGoingIds);

  if (friendsError) {
    console.error("Error fetching friends profiles:", friendsError);
    return NextResponse.json(
      { error: friendsError.message || "Failed to fetch friends" },
      { status: 500 }
    );
  }

  // Форматируем данные для ответа
  const items = (friendsProfiles || []).map((friend: any) => {
    const countryName = Array.isArray(friend.countries)
      ? friend.countries[0]?.name
      : (friend.countries as { name: string } | null | undefined)?.name;

    return {
      id: friend.id,
      avatar_url: friend.avatar_url,
      name: friend.twitter_name,
      twitter_handle: friend.twitter_handle,
      isVip: friend.subscription_tier === "vip",
      isVerified: friend.is_verified,
    };
  });

  return NextResponse.json({ items }, { status: 200 });
}

