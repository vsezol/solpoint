import { createClient } from "@/lib/supabase/server";
import { INTEREST_SLUGS } from "@/lib/profile-taxonomy";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isUUID } from "@/lib/utils";
import { parseBoundedInt } from "@/lib/security/request-guards";

const USERS_PUBLIC_FIELDS = `
  id,
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
  last_active_at,
  created_at,
  updated_at
`;

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
 * - mutual_friends_only: true - только взаимные друзья текущего пользователя
 * - current_user_id: необязательный guard (должен совпасть с авторизованным user id)
 * - limit: количество результатов (максимум 200)
 * - offset: смещение для пагинации
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const mutualFriendsOnly = searchParams.get("mutual_friends_only") === "true";
  const requestedCurrentUserId = searchParams.get("current_user_id");

  if (requestedCurrentUserId && !isUUID(requestedCurrentUserId)) {
    return NextResponse.json(
      { error: "current_user_id must be a valid UUID" },
      { status: 400 }
    );
  }

  const requestedInterestSlugs = parseCsv(searchParams.get("interest_slugs")).map(
    (slug) => slug.toLowerCase()
  );
  if (requestedInterestSlugs.some((slug) => !INTEREST_SLUGS.has(slug))) {
    return NextResponse.json(
      { error: "Invalid interest_slugs filter" },
      { status: 400 }
    );
  }

  let idFilter: string[] | null = null;

  if (mutualFriendsOnly) {
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required for mutual_friends_only filter" },
        { status: 401 }
      );
    }

    if (requestedCurrentUserId && requestedCurrentUserId !== authUser.id) {
      return NextResponse.json(
        { error: "current_user_id does not match current session" },
        { status: 403 }
      );
    }

    const currentUserId = authUser.id;

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
        ?.map((mf) =>
          mf.user_id === currentUserId ? mf.friend_id : mf.user_id
        )
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

    const { data: profileInterestRows, error: profileInterestsError } =
      await supabase
        .from("profile_interests")
        .select("user_id")
        .in("interest_id", interestIds);

    if (profileInterestsError) {
      console.error("Error fetching profile_interests:", profileInterestsError);
      return NextResponse.json(
        {
          error:
            profileInterestsError.message || "Failed to fetch profile interests",
        },
        { status: 500 }
      );
    }

    const interestUserIds = [
      ...new Set((profileInterestRows || []).map((row) => row.user_id)),
    ];
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

  let query = supabase
    .from("profiles")
    .select(USERS_PUBLIC_FIELDS)
    .order("created_at", { ascending: false });

  if (idFilter) {
    query = query.in("id", idFilter);
  }

  const countryCode = searchParams.get("country_code");
  if (countryCode) {
    query = query.eq("country_code", countryCode.toUpperCase());
  } else {
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
    const rolesArray = roles
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (rolesArray.length > 0) {
      query = query.in("role", rolesArray);
    }
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

  const limit = parseBoundedInt(searchParams.get("limit"), 200, 1, 200);
  const offset = parseBoundedInt(searchParams.get("offset"), 0, 0, 10_000);
  query = query.range(offset, offset + limit - 1);

  const { data: users, error } = await query;

  if (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }

  const { data: activeSubscriptions, error: subscriptionsError } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString());

  if (subscriptionsError) {
    console.error("Error fetching active subscriptions:", subscriptionsError);
  }

  const proUserIds = new Set<string>();
  for (const sub of activeSubscriptions || []) {
    proUserIds.add(sub.user_id);
  }

  const usersWithTier = (users || []).map((user) => ({
    ...user,
    subscription_tier:
      proUserIds.has(user.id) || user.subscription_tier === "vip"
        ? "vip"
        : "free",
  }));

  return NextResponse.json({ users: usersWithTier }, { status: 200 });
}
