import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface MutualConnectionItem {
  id: string;
  twitter_handle: string;
  twitter_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  subscription_tier: "free" | "vip";
}

const PREVIEW_LIMIT = 3;

function extractMutualFriendIds(
  rows: Array<{ user_id: string; friend_id: string }> | null,
  ownerId: string
): string[] {
  if (!rows || rows.length === 0) {
    return [];
  }

  const ids = new Set<string>();
  for (const row of rows) {
    if (row.user_id === ownerId) {
      ids.add(row.friend_id);
    } else if (row.friend_id === ownerId) {
      ids.add(row.user_id);
    }
  }

  return Array.from(ids);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("user_id");

    if (!targetUserId) {
      return NextResponse.json({ error: "user_id parameter is required" }, { status: 400 });
    }

    if (targetUserId === authUser.id) {
      return NextResponse.json({
        count: 0,
        preview: [],
        items: [],
      });
    }

    const [viewerMutualRowsResult, targetMutualRowsResult] = await Promise.all([
      supabase
        .from("mutual_friends")
        .select("user_id, friend_id")
        .or(`user_id.eq.${authUser.id},friend_id.eq.${authUser.id}`),
      supabase
        .from("mutual_friends")
        .select("user_id, friend_id")
        .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`),
    ]);

    if (viewerMutualRowsResult.error) {
      throw viewerMutualRowsResult.error;
    }
    if (targetMutualRowsResult.error) {
      throw targetMutualRowsResult.error;
    }

    const viewerFriendIds = extractMutualFriendIds(viewerMutualRowsResult.data, authUser.id);
    const targetFriendIds = extractMutualFriendIds(targetMutualRowsResult.data, targetUserId);

    if (viewerFriendIds.length === 0 || targetFriendIds.length === 0) {
      return NextResponse.json({
        count: 0,
        preview: [],
        items: [],
      });
    }

    const viewerFriendSet = new Set(viewerFriendIds);
    const mutualIds = targetFriendIds.filter((id) => viewerFriendSet.has(id));

    if (mutualIds.length === 0) {
      return NextResponse.json({
        count: 0,
        preview: [],
        items: [],
      });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, twitter_handle, twitter_name, avatar_url, is_verified, subscription_tier")
      .in("id", mutualIds);

    if (profilesError) {
      throw profilesError;
    }

    const profileById = new Map<string, MutualConnectionItem>();
    for (const profile of profiles || []) {
      profileById.set(profile.id, profile as MutualConnectionItem);
    }

    // Keep output deterministic and aligned with mutualIds order.
    const items = mutualIds
      .map((id) => profileById.get(id))
      .filter((item): item is MutualConnectionItem => Boolean(item));

    return NextResponse.json({
      count: items.length,
      preview: items.slice(0, PREVIEW_LIMIT),
      items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get mutual connections" },
      { status: 500 }
    );
  }
}
