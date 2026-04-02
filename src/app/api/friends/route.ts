import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/friends - подписаться на пользователя (follow)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friend_id } = await request.json();

    if (!friend_id) {
      return NextResponse.json(
        { error: "friend_id is required" },
        { status: 400 }
      );
    }

    if (authUser.id === friend_id) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    const { count: existingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", authUser.id)
      .eq("following_id", friend_id);

    if (existingCount && existingCount > 0) {
      return NextResponse.json(
        { error: "Already following this user" },
        { status: 400 }
      );
    }

    // Создаем подписку
    const { data: follow, error } = await supabase
      .from("follows")
      .insert({
        follower_id: authUser.id,
        following_id: friend_id,
      })
      .select()
      .single();

    if (error) throw error;

    const { count: mutualCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", friend_id)
      .eq("following_id", authUser.id);

    const isMutual = (mutualCount ?? 0) > 0;

    return NextResponse.json({
      data: {
        follow,
        status: isMutual ? "mutual" : "following",
        isMutual,
      },
      message: isMutual ? "Now following each other (friends)" : "Now following",
    });
  } catch (error: any) {
    console.error("Follow error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to follow user" },
      { status: 500 }
    );
  }
}

// DELETE /api/friends - отписаться от пользователя (unfollow)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const friend_id = searchParams.get("friend_id");

    if (!friend_id) {
      return NextResponse.json(
        { error: "friend_id is required" },
        { status: 400 }
      );
    }

    // Удаляем подписку (только свою)
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", authUser.id)
      .eq("following_id", friend_id);

    if (error) throw error;

    return NextResponse.json({
      message: "Unfollowed successfully",
    });
  } catch (error: any) {
    console.error("Unfollow error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unfollow user" },
      { status: 500 }
    );
  }
}

// GET /api/friends?user_id=xxx - получить статус подписки
// Возвращает: 'none', 'following', 'follower', 'mutual'
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
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const { data: status } = await supabase.rpc("get_follow_status", {
      p_user_id: authUser.id,
      p_other_user_id: user_id,
    }) as { data: "none" | "following" | "follower" | "mutual" | null };

    // Для обратной совместимости с фронтендом, маппим статусы
    let frontendStatus: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked" = "none";
    
    if (status === "mutual") {
      frontendStatus = "accepted"; // mutual friends = accepted
    } else if (status === "following") {
      frontendStatus = "pending_sent"; // following = pending_sent (для UI)
    } else if (status === "follower") {
      frontendStatus = "pending_received"; // follower = pending_received (входящий запрос)
    }

    const followStatus = status || "none";
    return NextResponse.json({
      data: {
        status: frontendStatus,
        followStatus,
        isMutual: followStatus === "mutual",
        userFollowsOther: followStatus === "following" || followStatus === "mutual",
        otherFollowsUser: followStatus === "follower" || followStatus === "mutual",
      },
    });
  } catch (error: any) {
    console.error("Get follow status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get follow status" },
      { status: 500 }
    );
  }
}

