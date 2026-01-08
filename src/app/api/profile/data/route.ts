import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/types";

/**
 * GET /api/profile/data
 * Получить данные профиля: события, количество друзей, статус дружбы, upcoming events
 * Query params: user_id (ID профиля, для которого загружаем данные)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("user_id");

    if (!targetUserId) {
      return NextResponse.json(
        { error: "user_id parameter is required" },
        { status: 400 }
      );
    }

    const now = new Date();
    const isOwnProfile = authUser?.id === targetUserId;

    // Параллельно получаем основные данные
    const [
      { data: eventAttendees },
      { count: mutualFriendsCount },
    ] = await Promise.all([
      // События пользователя (past events)
      supabase
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
        .eq("user_id", targetUserId)
        .eq("status", "going"),
      // Количество друзей
      supabase
        .from("mutual_friends")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`),
    ]);

    // Получаем статус дружбы (только для чужого профиля)
    let friendshipStatus: "none" | "pending_sent" | "pending_received" | "accepted" = "none";
    if (!isOwnProfile && authUser) {
      const [
        { data: userFollowsOther },
        { data: otherFollowsUser },
      ] = await Promise.all([
        supabase
          .from("follows")
          .select("*")
          .eq("follower_id", authUser.id)
          .eq("following_id", targetUserId)
          .maybeSingle(),
        supabase
          .from("follows")
          .select("*")
          .eq("follower_id", targetUserId)
          .eq("following_id", authUser.id)
          .maybeSingle(),
      ]);

      if (userFollowsOther && otherFollowsUser) {
        friendshipStatus = "accepted";
      } else if (userFollowsOther) {
        friendshipStatus = "pending_sent";
      } else if (otherFollowsUser) {
        friendshipStatus = "pending_received";
      }
    }

    // Получаем upcoming events по стране авторизованного пользователя
    let upcomingEvents: Event[] = [];
    if (authUser) {
      const { data: authUserProfile } = await supabase
        .from("profiles")
        .select("country_code")
        .eq("id", authUser.id)
        .maybeSingle();

      if (authUserProfile?.country_code) {
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

    // Обрабатываем события пользователя
    const allEvents: Event[] =
      eventAttendees?.map((ea: { event_id: string; events: Event | Event[] }) => {
        const event = Array.isArray(ea.events) ? ea.events[0] : ea.events;
        return event;
      }).filter((e): e is Event => Boolean(e)) || [];

    const pastEvents = allEvents.filter((e) => new Date(e.start_date) <= now);

    const friendsCount = mutualFriendsCount || 0;

    return NextResponse.json({
      pastEvents,
      friendsCount,
      friendshipStatus,
      upcomingEvents,
    });
  } catch (error: any) {
    console.error("Get profile data error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get profile data" },
      { status: 500 }
    );
  }
}

