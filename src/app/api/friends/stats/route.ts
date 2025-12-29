import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/friends/stats
 * Получить статистику друзей: количество друзей и заявок в друзья
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;

    // Получаем количество взаимных друзей (mutual follows)
    const { count: friendsCount, error: friendsError } = await supabase
      .from("mutual_friends")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (friendsError) {
      throw friendsError;
    }

    // Получаем количество заявок в друзья (те, кто подписан на нас, но мы не подписаны на них)
    // Это followers, которые не являются mutual
    const { data: followersData, error: followersError } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", userId);

    if (followersError) {
      throw followersError;
    }

    // Получаем список тех, на кого мы подписаны
    const { data: followingData, error: followingError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);

    if (followingError) {
      throw followingError;
    }

    const followingIds = new Set(followingData?.map((f) => f.following_id) || []);
    
    // Заявки в друзья = те, кто подписан на нас, но мы не подписаны на них
    const friendRequests = (followersData || []).filter(
      (f) => !followingIds.has(f.follower_id)
    );

    return NextResponse.json({
      friendsCount: friendsCount || 0,
      friendRequestsCount: friendRequests.length,
    });
  } catch (error: any) {
    console.error("Get friends stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get friends stats" },
      { status: 500 }
    );
  }
}


