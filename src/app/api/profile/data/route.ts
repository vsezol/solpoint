import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

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
    const eventFields = `id, name, image_url, country, country_code, city, start_date, end_date, slug, luma_link, attendees_count, event_type, visibility, is_online, owner_type, owner_id`;

    const eventsPromise = supabase
      .from("event_members")
      .select(`event_id, status, events (${eventFields})`)
      .eq("user_id", targetUserId)
      .eq("status", "going");

    const friendsCountPromise = supabase
      .from("mutual_friends")
      .select("*", { count: "exact", head: true })
      .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`);

    const followStatusPromise =
      !isOwnProfile && authUser
        ? supabase.rpc("get_follow_status", {
            p_user_id: authUser.id,
            p_other_user_id: targetUserId,
          })
        : null;

    const profilePromise = authUser
      ? supabase
          .from("profiles")
          .select("country_code")
          .eq("id", authUser.id)
          .maybeSingle()
      : null;

    const [eventsResult, friendsResult, followResult, profileResult] =
      await Promise.all([
        eventsPromise,
        friendsCountPromise,
        followStatusPromise ?? Promise.resolve(null),
        profilePromise ?? Promise.resolve(null),
      ]);

    let friendshipStatus: "none" | "pending_sent" | "pending_received" | "accepted" = "none";
    if (followResult) {
      const status = followResult.data as string | null;
      if (status === "mutual") friendshipStatus = "accepted";
      else if (status === "following") friendshipStatus = "pending_sent";
      else if (status === "follower") friendshipStatus = "pending_received";
    }

    let upcomingEvents: Event[] = [];
    if (profileResult?.data?.country_code) {
      const { data: countryEvents } = await supabase
        .from("events")
        .select(eventFields)
        .eq("country_code", profileResult.data.country_code)
        .gte("start_date", now.toISOString())
        .order("start_date", { ascending: true })
        .limit(10);

      upcomingEvents = (countryEvents || []) as Event[];
    }

    const allEvents: Event[] =
      (eventsResult.data || [])
        .map((ea: Record<string, unknown>) => {
          const evts = ea.events;
          return (Array.isArray(evts) ? evts[0] : evts) as Event | null;
        })
        .filter((e): e is Event => Boolean(e));

    const pastEvents = allEvents.filter((e) => new Date(e.start_date) <= now);

    return NextResponse.json({
      pastEvents,
      friendsCount: friendsResult.count || 0,
      friendshipStatus,
      upcomingEvents,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get profile data" },
      { status: 500 }
    );
  }
}
