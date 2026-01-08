import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/friends/list?user_id=xxx&type=mutual|followers|following
// Получить список друзей/подписчиков/подписок
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
    const type = searchParams.get("type") || "mutual"; // mutual, followers, following

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // Проверяем, может ли пользователь видеть этот список
    // Пока разрешаем всем видеть списки (можно добавить приватность позже)
    const isOwnProfile = authUser.id === user_id;

    let users: any[] = [];

    if (type === "mutual") {
      // Взаимные друзья (mutual follows)
      // Сначала получаем ID друзей из view (mutual_friends - это VIEW, не таблица)
      const { data: mutualFriendsData, error: mutualError } = await supabase
        .from("mutual_friends")
        .select("user_id, friend_id")
        .or(`user_id.eq.${user_id},friend_id.eq.${user_id}`);

      if (mutualError) throw mutualError;

      // Получаем ID всех друзей пользователя
      const friendIds: string[] = [];
      if (mutualFriendsData) {
        for (const mf of mutualFriendsData) {
          if (mf.user_id === user_id) {
            friendIds.push(mf.friend_id);
          } else if (mf.friend_id === user_id) {
            friendIds.push(mf.user_id);
          }
        }
      }

      if (friendIds.length === 0) {
        users = [];
      } else {
        // Загружаем профили друзей отдельным запросом
        const { data: friendsProfiles, error: profilesError } = await supabase
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
            updated_at,
            countries!fk_profiles_country_code (
              name
            )
          `)
          .in("id", friendIds);

        if (profilesError) throw profilesError;
        users = friendsProfiles || [];
      }
    } else if (type === "followers") {
      // Подписчики (те, кто подписан на пользователя)
      const { data: followersData, error } = await supabase
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
        .eq("following_id", user_id);

      if (error) throw error;

      users =
        followersData?.map((f: any) => {
          const profile = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
          return profile;
        }).filter((p: any) => Boolean(p)) || [];
    } else if (type === "following") {
      // Подписки (те, на кого подписан пользователь)
      const { data: followingData, error } = await supabase
        .from("follows")
        .select(
          `
          following_id,
          profiles!follows_following_id_fkey (
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
        .eq("follower_id", user_id);

      if (error) throw error;

      users =
        followingData?.map((f: any) => {
          const profile = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
          return profile;
        }).filter((p: any) => Boolean(p)) || [];
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use: mutual, followers, or following" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: users,
      count: users.length,
      type,
    });
  } catch (error: any) {
    console.error("Get friends list error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get friends list" },
      { status: 500 }
    );
  }
}




