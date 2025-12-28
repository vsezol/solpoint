import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/friends/requests
 * Получить список заявок в друзья (те, кто подписан на нас, но мы не подписаны на них)
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

    // Получаем всех подписчиков
    const { data: followersData, error: followersError } = await supabase
      .from("follows")
      .select(
        `
        follower_id,
        profiles!follows_follower_id_fkey (
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
        )
      `
      )
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
    const friendRequests = (followersData || [])
      .filter((f) => !followingIds.has(f.follower_id))
      .map((f: any) => {
        const profile = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
        return profile;
      })
      .filter((p: any) => Boolean(p));

    return NextResponse.json({
      data: friendRequests,
      count: friendRequests.length,
    });
  } catch (error: any) {
    console.error("Get friend requests error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get friend requests" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/friends/requests/accept
 * Принять заявку в друзья (подписаться на пользователя)
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

    const { friend_id } = await request.json();

    if (!friend_id) {
      return NextResponse.json(
        { error: "friend_id is required" },
        { status: 400 }
      );
    }

    // Подписываемся на пользователя (принимаем заявку)
    const { data: follow, error } = await supabase
      .from("follows")
      .insert({
        follower_id: authUser.id,
        following_id: friend_id,
      })
      .select()
      .single();

    if (error) {
      // Если уже подписаны, это нормально
      if (error.code === "23505") {
        return NextResponse.json({
          message: "Already following",
          isMutual: true,
        });
      }
      throw error;
    }

    // Проверяем, стала ли это взаимной подпиской
    const { data: mutualFollow } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", friend_id)
      .eq("following_id", authUser.id)
      .maybeSingle();

    const isMutual = !!mutualFollow;

    return NextResponse.json({
      message: isMutual ? "Friend request accepted (now friends)" : "Friend request accepted",
      isMutual,
    });
  } catch (error: any) {
    console.error("Accept friend request error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept friend request" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/friends/requests?friend_id=xxx
 * Отклонить заявку в друзья (удалить подписку пользователя на нас)
 */
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

    // Удаляем подписку пользователя на нас (отклоняем заявку)
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", friend_id)
      .eq("following_id", authUser.id);

    if (error) throw error;

    return NextResponse.json({
      message: "Friend request declined",
    });
  } catch (error: any) {
    console.error("Decline friend request error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to decline friend request" },
      { status: 500 }
    );
  }
}

