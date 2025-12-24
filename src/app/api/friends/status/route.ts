import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/friends/status
 * Проверка статуса дружбы для множества пользователей
 * Body: { user_ids: string[] }
 * Returns: { statuses: Record<string, "none" | "following" | "mutual"> }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user_ids } = await request.json();

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: "user_ids array is required" },
        { status: 400 }
      );
    }

    // Фильтруем свой ID
    const filteredUserIds = user_ids.filter((id) => id !== authUser.id);

    if (filteredUserIds.length === 0) {
      return NextResponse.json({ statuses: {} });
    }

    const statuses: Record<string, "none" | "following" | "mutual"> = {};

    // Получаем все подписки текущего пользователя на других
    const { data: userFollowsOthers } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", authUser.id)
      .in("following_id", filteredUserIds);

    // Получаем все подписки других пользователей на текущего
    const { data: othersFollowUser } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", authUser.id)
      .in("follower_id", filteredUserIds);

    const followingIds = new Set(
      userFollowsOthers?.map((f) => f.following_id) || []
    );
    const followerIds = new Set(
      othersFollowUser?.map((f) => f.follower_id) || []
    );

    // Определяем статус для каждого пользователя
    for (const userId of filteredUserIds) {
      const userFollowsOther = followingIds.has(userId);
      const otherFollowsUser = followerIds.has(userId);

      if (userFollowsOther && otherFollowsUser) {
        statuses[userId] = "mutual";
      } else if (userFollowsOther) {
        statuses[userId] = "following";
      } else {
        statuses[userId] = "none";
      }
    }

    return NextResponse.json({ statuses });
  } catch (error: any) {
    console.error("Get friendship statuses error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get friendship statuses" },
      { status: 500 }
    );
  }
}

