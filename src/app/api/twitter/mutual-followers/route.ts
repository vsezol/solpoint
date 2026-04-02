import { createClient } from "@/lib/supabase/server";
import { normalizeTwitterAvatarUrl } from "@/lib/twitter-avatar";
import { NextResponse } from "next/server";

const TWITTER_API_BASE = "https://api.twitterapi.io";
const SYNC_INTERVAL_HOURS = 24;

interface TwitterUser {
  id: string;
  userName: string;
  name?: string;
  profilePicture?: string;
  [key: string]: any;
}

interface TwitterApiResponse {
  followings?: TwitterUser[];
  followers?: TwitterUser[];
  has_next_page: boolean;
  next_cursor: string;
  status: string;
  message?: string;
}

/**
 * Задержка между запросами (для free-tier: минимум 5 секунд)
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Получает все подписчики/подписки с пагинацией и обработкой rate limit
 */
async function fetchAllTwitterUsers(
  endpoint: string,
  userName: string,
  apiKey: string,
  retryCount = 3
): Promise<TwitterUser[]> {
  const allUsers: TwitterUser[] = [];
  let cursor = "";
  let hasNextPage = true;
  let attempt = 0;

  while (hasNextPage) {
    const url = new URL(`${TWITTER_API_BASE}${endpoint}`);
    url.searchParams.set("userName", userName);
    url.searchParams.set("pageSize", "200");
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    let response: Response | null = null;
    let retries = 0;

    // Retry логика для обработки rate limit
    while (retries < retryCount) {
      try {
        response = await fetch(url.toString(), {
          headers: {
            "X-API-Key": apiKey,
          },
        });

        // Если получили 429, ждем и повторяем
        if (response.status === 429) {
          const waitTime = (retries + 1) * 6000; // 6, 12, 18 секунд
          console.log(`Rate limit hit, waiting ${waitTime}ms before retry ${retries + 1}/${retryCount}`);
          await delay(waitTime);
          retries++;
          continue;
        }

        // Если другая ошибка, выбрасываем исключение
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Twitter API error: ${response.status} - ${errorText}`
          );
        }

        // Успешный ответ, выходим из retry цикла
        break;
      } catch (error: any) {
        if (retries < retryCount - 1 && (error.message?.includes("429") || error.message?.includes("Too Many Requests"))) {
          const waitTime = (retries + 1) * 6000;
          console.log(`Error, waiting ${waitTime}ms before retry ${retries + 1}/${retryCount}`);
          await delay(waitTime);
          retries++;
          continue;
        }
        throw error;
      }
    }

    if (!response) {
      throw new Error("Failed to fetch after retries");
    }

    const data: TwitterApiResponse = await response.json();

    if (data.status === "error") {
      throw new Error(data.message || "Twitter API returned error");
    }

    const users = data.followings || data.followers || [];
    allUsers.push(...users);

    hasNextPage = data.has_next_page || false;
    cursor = data.next_cursor || "";

    // Защита от бесконечного цикла
    if (!hasNextPage || !cursor) {
      break;
    }

    // Задержка между страницами пагинации (минимум 5 секунд для free-tier)
    if (hasNextPage) {
      await delay(5500); // 5.5 секунд для надежности
    }

    attempt++;
  }

  return allUsers;
}

/**
 * Синхронизирует взаимных подписчиков с Twitter API
 */
async function syncMutualFollowers(
  supabase: any,
  userId: string,
  twitterHandle: string,
  apiKey: string
) {
  try {
    // Получаем подписчиков и подписки последовательно с задержкой
    // (для free-tier лимит: 1 запрос каждые 5 секунд)
    console.log("Fetching followers...");
    const followers = await fetchAllTwitterUsers(
      "/twitter/user/followers",
      twitterHandle,
      apiKey
    );

    // Задержка между двумя основными запросами (followers и followings)
    console.log("Waiting 6 seconds before fetching followings...");
    await delay(6000);

    console.log("Fetching followings...");
    const followings = await fetchAllTwitterUsers(
      "/twitter/user/followings",
      twitterHandle,
      apiKey
    );

    // Создаем Set для быстрого поиска
    const followersById = new Map<string, TwitterUser>();
    const followersByUsername = new Map<string, TwitterUser>();

    followers.forEach((f) => {
      if (f.id) {
        followersById.set(f.id, f);
      }
      if (f.userName) {
        followersByUsername.set(f.userName.toLowerCase(), f);
      }
    });

    const followingsById = new Map<string, TwitterUser>();
    const followingsByUsername = new Map<string, TwitterUser>();

    followings.forEach((f) => {
      if (f.id) {
        followingsById.set(f.id, f);
      }
      if (f.userName) {
        followingsByUsername.set(f.userName.toLowerCase(), f);
      }
    });

    // Находим пересечение по ID (приоритет) или username
    const mutualUsers: TwitterUser[] = [];

    // Сначала по ID
    for (const [id, user] of followersById) {
      if (followingsById.has(id)) {
        mutualUsers.push(user);
      }
    }

    // Затем по username (если нет ID)
    for (const [username, user] of followersByUsername) {
      if (
        followingsByUsername.has(username) &&
        !mutualUsers.some((u) => u.id === user.id || u.userName === user.userName)
      ) {
        mutualUsers.push(user);
      }
    }

    // Удаляем старые записи для этого пользователя
    await supabase
      .from("twitter_connections")
      .delete()
      .eq("user_id", userId);

    // Сохраняем только mutuals
    if (mutualUsers.length > 0) {
      const connections = mutualUsers.map((user) => ({
        user_id: userId,
        twitter_friend_id: user.id || user.userName, // Используем ID если есть, иначе username
        twitter_friend_username: user.userName || "",
        twitter_friend_avatar_url: normalizeTwitterAvatarUrl(user.profilePicture || null) || null,
      }));

      const { error: insertError } = await supabase
        .from("twitter_connections")
        .insert(connections);

      if (insertError) {
        throw insertError;
      }
    }

    // Обновляем last_twitter_sync_at
    await supabase
      .from("profiles")
      .update({ last_twitter_sync_at: new Date().toISOString() })
      .eq("id", userId);

    return mutualUsers.length;
  } catch (error: any) {
    console.error("Error syncing mutual followers:", error);
    throw error;
  }
}

/**
 * GET /api/twitter/mutual-followers
 * Получает список взаимных подписчиков из Twitter, которые зарегистрированы в SolPoint
 * Синхронизирует данные не чаще раза в 24 часа
 */
export async function GET() {
  const supabase = await createClient();

  // Проверка аутентификации
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Получаем профиль пользователя
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("twitter_handle, twitter_id, last_twitter_sync_at")
    .eq("id", authUser.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  if (!profile.twitter_handle) {
    return NextResponse.json(
      { error: "Twitter handle not found" },
      { status: 400 }
    );
  }

  const apiKey = process.env.TWITTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Twitter API key not configured" },
      { status: 500 }
    );
  }

  // Проверяем, нужно ли синхронизировать
  const needsSync =
    !profile.last_twitter_sync_at ||
    new Date(profile.last_twitter_sync_at).getTime() <
      Date.now() - SYNC_INTERVAL_HOURS * 60 * 60 * 1000;

  // Если нужно синхронизировать, делаем это
  if (needsSync) {
    try {
      await syncMutualFollowers(
        supabase,
        authUser.id,
        profile.twitter_handle,
        apiKey
      );
    } catch (error: any) {
      console.error("Sync error:", error);
      // Продолжаем работу с кэшированными данными, даже если синхронизация не удалась
    }
  }

  // Получаем взаимных подписчиков из БД и проверяем, кто зарегистрирован в SolPoint
  const { data: connections, error: connectionsError } = await supabase
    .from("twitter_connections")
    .select("twitter_friend_id, twitter_friend_username, twitter_friend_avatar_url")
    .eq("user_id", authUser.id);

  if (connectionsError) {
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    );
  }

  if (!connections || connections.length === 0) {
    return NextResponse.json({
      mutualFollowers: [],
      count: 0,
      totalMutualOnTwitter: 0,
      lastSyncedAt: profile.last_twitter_sync_at,
    });
  }

  // Разделяем connections на те, у которых есть ID (числовой) и те, у которых только username
  const connectionsWithId = connections.filter((c) => 
    c.twitter_friend_id && /^\d+$/.test(c.twitter_friend_id)
  );
  const connectionsWithUsername = connections.filter((c) => 
    c.twitter_friend_username
  );

  const twitterIds = connectionsWithId.map((c) => c.twitter_friend_id);
  const usernames = connectionsWithUsername.map((c) => 
    c.twitter_friend_username.toLowerCase()
  );

  // Ищем зарегистрированных пользователей по twitter_id и username одновременно
  let allRegisteredUsers: any[] = [];

  // Поиск по ID
  if (twitterIds.length > 0) {
    const { data: usersById, error: usersByIdError } = await supabase
      .from("profiles")
      .select("*")
      .in("twitter_id", twitterIds)
      .neq("id", authUser.id);

    if (usersByIdError) {
      console.error("Error fetching users by ID:", usersByIdError);
    } else if (usersById) {
      allRegisteredUsers = [...allRegisteredUsers, ...usersById];
    }
  }

  // Поиск по username (только тех, кого еще не нашли)
  if (usernames.length > 0) {
    const foundIds = new Set(allRegisteredUsers.map((u) => u.id));
    const { data: usersByUsername, error: usersByUsernameError } = await supabase
      .from("profiles")
      .select("*")
      .in("twitter_handle", usernames)
      .neq("id", authUser.id);

    if (usersByUsernameError) {
      console.error("Error fetching users by username:", usersByUsernameError);
    } else if (usersByUsername) {
      // Добавляем только тех, кого еще не нашли
      const newUsers = usersByUsername.filter((u) => !foundIds.has(u.id));
      allRegisteredUsers = [...allRegisteredUsers, ...newUsers];
    }
  }

  // Удаляем дубликаты (на случай, если пользователь найден и по ID, и по username)
  const uniqueUsers = Array.from(
    new Map(allRegisteredUsers.map((u) => [u.id, u])).values()
  );

  // Получаем активные подписки для определения subscription_tier
  const { data: activeSubscriptions } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString());

  const proUserIds = new Set(
    activeSubscriptions?.map((sub) => sub.user_id) || []
  );

  // Обновляем subscription_tier
  const usersWithTier = uniqueUsers.map((user: any) => ({
    ...user,
    subscription_tier: proUserIds.has(user.id) ? "pro" : "free",
  }));

  return NextResponse.json({
    mutualFollowers: usersWithTier,
    count: usersWithTier.length,
    totalMutualOnTwitter: connections.length,
    lastSyncedAt: profile.last_twitter_sync_at,
  });
}
