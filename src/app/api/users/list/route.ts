import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type FilterType = "all" | "country" | "city";

const USER_LIST_FIELDS = `
  id,
  twitter_name,
  avatar_url,
  subscription_tier,
  is_verified,
  created_at
`;

/**
 * GET /api/users/list
 *
 * Query params:
 * - filter: all | country | city
 * - country_code: ISO 3166-1 alpha-2
 * - city: city name
 * - limit: page size (default 50, max 200)
 * - offset: pagination offset
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const filter = (searchParams.get("filter") || "all") as FilterType;
  const countryCode = searchParams.get("country_code");
  const city = searchParams.get("city");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const { data: { user: authUser } } = await supabase.auth.getUser();

  let query = supabase
    .from("profiles")
    .select(USER_LIST_FIELDS, { count: "exact" })
    .order("created_at", { ascending: false });

  if (filter === "country" && countryCode) {
    query = query.eq("country_code", countryCode.toUpperCase());
  } else if (filter === "city" && city) {
    query = query.ilike("city", `%${city}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const subscriptionsPromise = supabase
    .from("subscriptions")
    .select("user_id")
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString());

  const mutualFriendsPromise = authUser
    ? supabase
        .from("mutual_friends")
        .select("user_id, friend_id")
        .or(`user_id.eq.${authUser.id},friend_id.eq.${authUser.id}`)
    : null;

  const [
    { data: users, count: totalCount, error },
    { data: activeSubscriptions },
    mutualFriendsResult,
  ] = await Promise.all([
    query,
    subscriptionsPromise,
    mutualFriendsPromise ?? Promise.resolve({ data: null }),
  ]);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }

  const proUserIds = new Set<string>();
  if (activeSubscriptions) {
    for (const sub of activeSubscriptions) {
      proUserIds.add(sub.user_id);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedUsers = (users || []).map((user: any) => ({
    id: user.id as string,
    avatar_url: user.avatar_url,
    name: user.twitter_name,
    isVip: proUserIds.has(user.id) || user.subscription_tier === "vip",
    isVerified: user.is_verified,
    isOwner: false,
    joinedAt: user.created_at,
  }));

  let friends: typeof formattedUsers = [];

  if (authUser && mutualFriendsResult?.data) {
    const friendIdSet = new Set<string>();
    for (const mf of mutualFriendsResult.data) {
      if (mf.user_id === authUser.id) friendIdSet.add(mf.friend_id);
      else if (mf.friend_id === authUser.id) friendIdSet.add(mf.user_id);
    }
    friends = formattedUsers.filter((u) => friendIdSet.has(u.id));
  }

  return NextResponse.json(
    {
      totalCount: totalCount ?? formattedUsers.length,
      totalUsers: formattedUsers.length,
      totalFriends: friends.length,
      users: formattedUsers,
      friends: friends,
    },
    { status: 200 }
  );
}
