import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";
import type { User, Event } from "@/types";
import { ProfileContent } from "../profile-content";
import { ProfileEditProvider } from "../profile-edit-provider";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
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

  // Определяем, является ли это профилем текущего пользователя
  // Сравниваем ID текущего авторизованного пользователя с ID профиля
  const isOwnProfile = Boolean(authUser?.id && user.id && authUser.id === user.id);

  // Получаем события пользователя (для любого профиля)
  let upcomingEvents: Event[] = [];
  let pastEvents: Event[] = [];
  let allUpcomingEvents: Event[] = []; // Все предстоящие события для блока "What's happening"
  let friends: User[] = [];
  let friendshipStatus: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked" = "none";

  // Получаем события пользователя
  const { data: eventAttendees } = await supabase
    .from("event_attendees")
    .select(
      `
      event_id,
      events (
        id,
        name,
        description,
        image_url,
        country,
        country_code,
        city,
        address,
        latitude,
        longitude,
        start_date,
        end_date,
        event_type,
        visibility,
        is_paid,
        price_sol,
        max_attendees,
        attendees_count,
        socials,
        organizer_id,
        slug,
        created_at
      )
    `
    )
    .eq("user_id", user.id);

  const allEvents: Event[] =
    eventAttendees?.map((ea: any) => {
      const event = Array.isArray(ea.events) ? ea.events[0] : ea.events;
      return event;
    }).filter((e: any): e is Event => Boolean(e)) || [];

  const now = new Date();
  upcomingEvents = allEvents.filter((e) => new Date(e.start_date) > now);
  pastEvents = allEvents.filter((e) => new Date(e.start_date) <= now);

  // Получаем все предстоящие события для блока "What's happening" (только для своего профиля)
  if (isOwnProfile) {
    const { data: allEventsData } = await supabase
      .from("events")
      .select("*")
      .gte("start_date", now.toISOString())
      .order("start_date", { ascending: true })
      .limit(10);

    allUpcomingEvents = (allEventsData || []) as Event[];
  }

  // Получаем количество взаимных друзей (mutual follows) для любого профиля
  let friendsCount = 0;
  const { count: mutualFriendsCount } = await supabase
    .from("mutual_friends")
    .select("*", { count: "exact", head: true })
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
  
  friendsCount = mutualFriendsCount || 0;

  // Получаем взаимных друзей пользователя (только для своего профиля)
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
      mutualFriendsData?.map((mf: any) => {
        const profile = Array.isArray(mf.profiles) ? mf.profiles[0] : mf.profiles;
        return profile;
      }).filter((p: any): p is User => Boolean(p)) || [];
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

