import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/api/meeting-requests/helpers";

/**
 * GET /api/meeting-requests/can-request?userId=<profile_user_id>
 * Returns whether the current user can send a meeting request to the profile user.
 * Can request = both are internal attendees (going) of at least one same upcoming event.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if ("response" in auth) return auth.response;
    const { supabase, authUser } = auth;

    const { searchParams } = new URL(request.url);
    const profileUserId = searchParams.get("userId");
    if (!profileUserId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (profileUserId === authUser.id) {
      return NextResponse.json({ canRequest: false, sharedEvents: [] });
    }

    const now = new Date().toISOString();

    // My event ids (internal, going)
    const { data: myRows } = await supabase
      .from("event_members")
      .select("event_id")
      .eq("user_id", authUser.id)
      .eq("status", "going");

    const myEventIds = (myRows || []).map((r) => r.event_id);

    // Their event ids (internal, going)
    const { data: theirRows } = await supabase
      .from("event_members")
      .select("event_id")
      .eq("user_id", profileUserId)
      .eq("status", "going");

    const theirEventIds = (theirRows || []).map((r) => r.event_id);

    const mySet = new Set(myEventIds);
    const sharedEventIds = theirEventIds.filter((id) => mySet.has(id));

    if (sharedEventIds.length === 0) {
      return NextResponse.json({ canRequest: false, sharedEvents: [] });
    }

    // Load upcoming filter: only include events that are still upcoming
    const { data: events } = await supabase
      .from("events")
      .select("id, name, slug, timezone")
      .in("id", sharedEventIds)
      .gte("start_date", now)
      .order("start_date", { ascending: true });

    const sharedEvents = (events || []).map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug ?? null,
      timezone: e.timezone ?? null,
    }));

    return NextResponse.json({
      canRequest: sharedEvents.length > 0,
      sharedEvents,
    });
  } catch (error) {
    console.error("Can-request meeting error:", error);
    return NextResponse.json(
      { error: "Failed to check meeting request availability" },
      { status: 500 }
    );
  }
}
