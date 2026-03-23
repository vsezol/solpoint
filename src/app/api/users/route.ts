import { createClient } from "@/lib/supabase/server";
import { INTEREST_SLUGS } from "@/lib/profile-taxonomy";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * GET /api/users
 * Список пользователей с фильтрами для карты
 * 
 * Query params:
 * - country: фильтр по стране
 * - country_code: фильтр по коду страны (ISO 3166-1 alpha-2)
 * - city: фильтр по городу
 * - role: фильтр по роли (см. USER_ROLE_OPTIONS в profile-taxonomy)
 * - interest_slugs: CSV профильных интересов (slug); пользователь попадает в выборку, если есть хотя бы один из них (как у attendees)
 * - open_to_meet: true - только открытые к встречам
 * - active_only: true - только активные (за последние 30 дней)
 * - mutual_friends_only: true - только взаимные друзья (требует current_user_id)
 * - current_user_id: ID текущего пользователя (для фильтра mutual_friends_only)
 * - limit: количество результатов (по умолчанию 1000)
 * - offset: смещение для пагинации
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const mutualFriendsOnly = searchParams.get("mutual_friends_only");
  const currentUserId = searchParams.get("current_user_id");

  const requestedInterestSlugs = parseCsv(searchParams.get("interest_slugs")).map((slug) =>
    slug.toLowerCase()
  );
  if (requestedInterestSlugs.some((slug) => !INTEREST_SLUGS.has(slug))) {
    return NextResponse.json({ error: "Invalid interest_slugs filter" }, { status: 400 });
  }

  /** When set, restrict profiles to these ids (intersection of mutual friends + interests as needed). */
  let idFilter: string[] | null = null;

  if (mutualFriendsOnly === "true" && currentUserId) {
    const { data: mutualFriends, error: mutualFriendsError } = await supabase
      .from("mutual_friends")
      .select("user_id, friend_id")
      .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

    if (mutualFriendsError) {
      console.error("Error fetching mutual friends:", mutualFriendsError);
      return NextResponse.json(
        { error: "Failed to fetch mutual friends" },
        { status: 500 }
      );
    }

    const friendIds =
      mutualFriends
        ?.map((mf) => (mf.user_id === currentUserId ? mf.friend_id : mf.user_id))
        .filter((id) => id !== currentUserId) || [];

    if (friendIds.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    idFilter = friendIds;
  }

  if (requestedInterestSlugs.length > 0) {
    const { data: interestRows, error: interestsError } = await supabase
      .from("interests")
      .select("id")
      .in("slug", requestedInterestSlugs);

    if (interestsError) {
      console.error("Error resolving interest slugs:", interestsError);
      return NextResponse.json(
        { error: interestsError.message || "Failed to resolve interests" },
        { status: 500 }
      );
    }

    const interestIds = (interestRows || []).map((row) => row.id);
    if (interestIds.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const { data: profileInterestRows, error: profileInterestsError } = await supabase
      .from("profile_interests")
      .select("user_id")
      .in("interest_id", interestIds);

    if (profileInterestsError) {
      console.error("Error fetching profile_interests:", profileInterestsError);
      return NextResponse.json(
        { error: profileInterestsError.message || "Failed to fetch profile interests" },
        { status: 500 }
      );
    }

    const interestUserIds = [...new Set((profileInterestRows || []).map((row) => row.user_id))];
    if (interestUserIds.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    if (idFilter) {
      const allowed = new Set(interestUserIds);
      idFilter = idFilter.filter((id) => allowed.has(id));
    } else {
      idFilter = interestUserIds;
    }

    if (idFilter.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }
  }

  // Строим запрос
  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (idFilter) {
    query = query.in("id", idFilter);
  }

  // Фильтры по стране (приоритет country_code, fallback на country для обратной совместимости)
  const countryCode = searchParams.get("country_code");
  if (countryCode) {
    // Приоритет: фильтр по коду страны (ISO 3166-1 alpha-2)
    query = query.eq("country_code", countryCode.toUpperCase());
  } else {
    // Fallback: фильтр по названию страны (для обратной совместимости)
    const country = searchParams.get("country");
    if (country) {
      query = query.eq("country", country);
    }
  }

  const city = searchParams.get("city");
  if (city) {
    query = query.ilike("city", `%${city}%`);
  }

  const role = searchParams.get("role");
  if (role) {
    query = query.eq("role", role);
  }

  const roles = searchParams.get("roles");
  if (roles) {
    const rolesArray = roles.split(",");
    query = query.in("role", rolesArray);
  }

  const openToMeet = searchParams.get("open_to_meet");
  if (openToMeet === "true") {
    query = query.eq("is_open_to_meet", true);
  }

  const activeOnly = searchParams.get("active_only");
  if (activeOnly === "true") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query = query.gte("last_active_at", thirtyDaysAgo.toISOString());
  }

  // Пагинация
  const limit = parseInt(searchParams.get("limit") || "200", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
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
    // Продолжаем работу, используя subscription_tier из profiles как fallback
  }

  // Создаем Set с ID пользователей с активными подписками
  const proUserIds = new Set<string>();
  if (activeSubscriptions) {
    activeSubscriptions.forEach((sub) => {
      proUserIds.add(sub.user_id);
    });
  }

  // Обновляем subscription_tier для каждого пользователя на основе активных подписок
  const usersWithTier = (users || []).map((user: any) => ({
    ...user,
    subscription_tier: proUserIds.has(user.id) ? "pro" : "free",
  }));

  return NextResponse.json({ users: usersWithTier }, { status: 200 });
}
