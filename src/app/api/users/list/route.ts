import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type FilterType = "all" | "country" | "city";

/**
 * GET /api/users/list
 * Получить список пользователей с фильтрами
 * 
 * Query params:
 * - filter: тип фильтра (all, country, city)
 * - country_code: код страны (ISO 3166-1 alpha-2) - для filter=country
 * - city: название города - для filter=city
 * - limit: количество результатов (по умолчанию 1000)
 * - offset: смещение для пагинации
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const filter = (searchParams.get("filter") || "all") as FilterType;
  const countryCode = searchParams.get("country_code");
  const city = searchParams.get("city");
  const limit = parseInt(searchParams.get("limit") || "1000", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Получаем текущего пользователя (если авторизован)
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Строим запрос
  let query = supabase
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
      updated_at
    `)
    .order("created_at", { ascending: false });

  // Применяем фильтры
  if (filter === "country" && countryCode) {
    query = query.eq("country_code", countryCode.toUpperCase());
  } else if (filter === "city" && city) {
    query = query.ilike("city", `%${city}%`);
  }

  // Пагинация
  query = query.range(offset, offset + limit - 1);

  const { data: users, error } = await query;

  if (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }

  // Получаем активные подписки для вычисления subscription_tier
  const { data: activeSubscriptions, error: subscriptionsError } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString());

  if (subscriptionsError) {
    console.error("Error fetching active subscriptions:", subscriptionsError);
  }

  // Создаем Set с ID пользователей с активными подписками
  const proUserIds = new Set<string>();
  if (activeSubscriptions) {
    activeSubscriptions.forEach((sub) => {
      proUserIds.add(sub.user_id);
    });
  }

  // Форматируем пользователей в формат, похожий на members
  const formattedUsers = (users || []).map((user: any) => ({
    id: user.id,
    avatar_url: user.avatar_url,
    name: user.twitter_name,
    twitter_handle: user.twitter_handle,
    isVip: proUserIds.has(user.id) || user.subscription_tier === "vip",
    isVerified: user.is_verified,
    isOwner: false,
    joinedAt: user.created_at,
  }));

  // Получаем друзей авторизованного пользователя (если авторизован)
  let friends: typeof formattedUsers = [];
  const friendIds: string[] = [];

  if (authUser) {
    // Получаем взаимных друзей
    const { data: mutualFriendsData } = await supabase
      .from("mutual_friends")
      .select("user_id, friend_id")
      .or(`user_id.eq.${authUser.id},friend_id.eq.${authUser.id}`);

    if (mutualFriendsData) {
      for (const mf of mutualFriendsData) {
        if (mf.user_id === authUser.id) {
          friendIds.push(mf.friend_id);
        } else if (mf.friend_id === authUser.id) {
          friendIds.push(mf.user_id);
        }
      }
    }

    // Находим друзей среди пользователей
    const userIds = new Set(formattedUsers.map((u) => u.id));
    const friendsInList = friendIds.filter((id) => userIds.has(id));

    if (friendsInList.length > 0) {
      friends = formattedUsers.filter((u) => friendsInList.includes(u.id));
    }
  }

  return NextResponse.json(
    {
      totalUsers: formattedUsers.length,
      totalFriends: friends.length,
      users: formattedUsers,
      friends: friends,
    },
    { status: 200 }
  );
}

