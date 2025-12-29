import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";
import type { User, Event } from "@/types";
import { ProfileContent } from "../profile-content";
import { ProfileEditProvider } from "../profile-edit-provider";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/utils";
import { ProfileViewTracker } from "@/components/analytics/profile-view-tracker";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  // Убираем @ если он есть в начале
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  
  // Получаем профиль пользователя
  const { data: user } = await supabase
    .from("profiles")
    .select(`
      *,
      countries!fk_profiles_country_code (
        name
      )
    `)
    .eq("twitter_handle", cleanUsername)
    .maybeSingle();

  if (!user) {
    return {
      title: "Profile Not Found",
    };
  }

  const appUrl = getAppUrl();
  const profileUrl = `${appUrl}/profile/${cleanUsername}`;
  // Для профилей всегда используем логотип
  const imageUrl = `${appUrl}/logo.svg`;
  
  const location = user.city && user.countries?.name
    ? `${user.city}, ${user.countries.name}`
    : user.countries?.name || user.city || "";
  
  const description = user.bio 
    ? `${user.bio}${location ? ` | ${location}` : ""}`
    : location 
    ? `Solana community member${location ? ` from ${location}` : ""}`
    : "Solana community member on SolPoint";

  return {
    title: `${user.twitter_name} (@${user.twitter_handle}) | SolPoint`,
    description: description,
    openGraph: {
      title: `${user.twitter_name} (@${user.twitter_handle})`,
      description: description,
      type: "profile",
      url: profileUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: user.twitter_name,
        },
      ],
      siteName: "SolPoint",
    },
    twitter: {
      card: "summary_large_image",
      title: `${user.twitter_name} (@${user.twitter_handle})`,
      description: description,
      images: [imageUrl],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Получаем текущего пользователя для проверки, это его профиль или нет
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Получаем профиль пользователя по никнейму (может быть свой или чужой)
  // Убираем @ если он есть в начале
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  
  // Получаем профиль по точному совпадению twitter_handle
  const { data: user, error: profileError } = await supabase
    .from("profiles")
    .select(`
      *,
      countries!fk_profiles_country_code (
        name
      )
    `)
    .eq("twitter_handle", cleanUsername)
    .maybeSingle();

  // Если пользователь не найден или ошибка
  if (profileError || !user) {
    notFound();
  }

  // Отладка: логируем данные пользователя с сервера (удалить после отладки)
  // console.log вызывается на сервере, для просмотра используйте терминал

  // Определяем, является ли это профилем текущего пользователя
  // Сравниваем ID текущего авторизованного пользователя с ID профиля
  const isOwnProfile = Boolean(authUser?.id && user.id && authUser.id === user.id);

  // Получаем события пользователя (для любого профиля)
  // События, на которые пользователь зарегистрировался (нажал "участвовать")
  let upcomingEvents: Event[] = [];
  let pastEvents: Event[] = [];
  let friends: User[] = [];
  let friendshipStatus: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked" = "none";

  // Получаем события пользователя из event_members (события, на которые он зарегистрировался со статусом "going")
  const { data: eventAttendees } = await supabase
    .from("event_members")
    .select(
      `
      event_id,
      status,
      events (
        id,
        name,
        description,
        image_url,
        country,
        country_code,
        city,
        address,
        venue_name,
        latitude,
        longitude,
        start_date,
        end_date,
        timezone,
        event_type,
        visibility,
        is_paid,
        price_sol,
        price_usd,
        max_attendees,
        attendees_count,
        capacity_remaining,
        registration_deadline,
        is_online,
        socials,
        contacts,
        owner_type,
        owner_id,
        slug,
        luma_link,
        created_at,
        updated_at
      )
    `
    )
    .eq("user_id", user.id)
    .eq("status", "going");

  const allEvents: Event[] =
    eventAttendees?.map((ea: { event_id: string; events: Event | Event[] }) => {
      const event = Array.isArray(ea.events) ? ea.events[0] : ea.events;
      return event;
    }).filter((e): e is Event => Boolean(e)) || [];

  const now = new Date();
  pastEvents = allEvents.filter((e) => new Date(e.start_date) <= now);

  // Получаем предстоящие события по стране авторизованного пользователя для блока "What's happening"
  // Если пользователь не авторизован, показываем пустой список
  if (authUser) {
    // Получаем профиль авторизованного пользователя для получения его страны
    const { data: authUserProfile } = await supabase
      .from("profiles")
      .select("country_code")
      .eq("id", authUser.id)
      .maybeSingle();

    if (authUserProfile?.country_code) {
      // Получаем предстоящие события по стране авторизованного пользователя
      const { data: countryEvents } = await supabase
        .from("events")
        .select("*")
        .eq("country_code", authUserProfile.country_code)
        .gte("start_date", now.toISOString())
        .order("start_date", { ascending: true })
        .limit(10);

      upcomingEvents = (countryEvents || []) as Event[];
    }
  }

  // Получаем количество взаимных друзей (mutual follows) для любого профиля
  let friendsCount = 0;
  const { count: mutualFriendsCount } = await supabase
    .from("mutual_friends")
    .select("*", { count: "exact", head: true })
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
  
  friendsCount = mutualFriendsCount || 0;

  // Получаем взаимных друзей пользователя (только для своего профиля)
  // Переменная friends не используется, но оставлена для будущего использования
  if (isOwnProfile && authUser) {
    const { data: mutualFriendsData } = await supabase
      .from("mutual_friends")
      .select(
        `
        friend_id,
        profiles!mutual_friends_friend_id_fkey (
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
      .eq("user_id", authUser.id);

    friends =
      mutualFriendsData?.map((mf: { friend_id: string; profiles: User | User[] }) => {
        const profile = Array.isArray(mf.profiles) ? mf.profiles[0] : mf.profiles;
        return profile;
      }).filter((p): p is User => Boolean(p)) || [];
  }

  // Получаем статус подписки для чужого профиля
  if (!isOwnProfile && authUser) {
    // Проверяем, подписан ли текущий пользователь на другого
    const { data: userFollowsOther } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", authUser.id)
      .eq("following_id", user.id)
      .maybeSingle();

    // Проверяем, подписан ли другой пользователь на текущего
    const { data: otherFollowsUser } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", user.id)
      .eq("following_id", authUser.id)
      .maybeSingle();

    // Определяем статус для обратной совместимости с UI
    if (userFollowsOther && otherFollowsUser) {
      friendshipStatus = "accepted"; // mutual friends
    } else if (userFollowsOther) {
      friendshipStatus = "pending_sent"; // following
    } else if (otherFollowsUser) {
      friendshipStatus = "pending_received"; // follower (входящий запрос)
    } else {
      friendshipStatus = "none";
    }
  }

  return (
    <>
      <Header />
      <ProfileViewTracker user={user} isOwnProfile={isOwnProfile} />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <ProfileEditProvider>
            <ProfileContent
              user={user}
              isOwnProfile={isOwnProfile}
              friendshipStatus={friendshipStatus}
              friendsCount={friendsCount}
              upcomingEvents={upcomingEvents}
              pastEvents={pastEvents}
            />
          </ProfileEditProvider>
        </div>
      </main>
      <Footer />
    </>
  );
}

