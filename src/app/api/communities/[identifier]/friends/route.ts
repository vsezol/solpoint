import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const { identifier } = await params;
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Преобразуем identifier в ID
  const communityId = await getEntityIdByIdentifier("community", identifier);
  if (!communityId) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const { data: members, error: membersError } = await supabase
    .from("community_members")
    .select("user_id")
    .eq("community_id", communityId);

  if (membersError) {
    return NextResponse.json(
      { error: membersError.message || "Failed to fetch members" },
      { status: 500 }
    );
  }

  const memberUserIds = new Set((members || []).map((m) => m.user_id));

  const { data: mutualFriendsData } = await supabase
    .from("mutual_friends")
    .select("user_id, friend_id")
    .or(`user_id.eq.${authUser.id},friend_id.eq.${authUser.id}`);

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

  const friendsGoingIds = friendIds.filter((id) => memberUserIds.has(id));

  if (friendsGoingIds.length === 0) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

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
    return NextResponse.json(
      { error: friendsError.message || "Failed to fetch friends" },
      { status: 500 }
    );
  }

  const items = (friendsProfiles || []).map((friend: any) => ({
    id: friend.id,
    avatar_url: friend.avatar_url,
    name: friend.twitter_name,
    twitter_handle: friend.twitter_handle,
    isVip: friend.subscription_tier === "vip",
    isVerified: friend.is_verified,
  }));

  return NextResponse.json({ items }, { status: 200 });
}

