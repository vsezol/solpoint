import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface MutualEventItem {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string | null;
  city: string;
  country: string;
  timezone: string | null;
}

const PREVIEW_LIMIT = 3;

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
    const targetUserId = searchParams.get("user_id");

    if (!targetUserId) {
      return NextResponse.json({ error: "user_id parameter is required" }, { status: 400 });
    }

    if (targetUserId === authUser.id) {
      return NextResponse.json({
        count: 0,
        preview: [],
        items: [],
      });
    }

    const [viewerEventsResult, targetEventsResult] = await Promise.all([
      supabase
        .from("event_members")
        .select("event_id")
        .eq("user_id", authUser.id)
        .eq("status", "going"),
      supabase
        .from("event_members")
        .select("event_id")
        .eq("user_id", targetUserId)
        .eq("status", "going"),
    ]);

    if (viewerEventsResult.error) {
      throw viewerEventsResult.error;
    }
    if (targetEventsResult.error) {
      throw targetEventsResult.error;
    }

    const viewerEventIds = new Set((viewerEventsResult.data || []).map((row) => row.event_id));
    const sharedEventIds = (targetEventsResult.data || [])
      .map((row) => row.event_id)
      .filter((eventId) => viewerEventIds.has(eventId));

    if (sharedEventIds.length === 0) {
      return NextResponse.json({
        count: 0,
        preview: [],
        items: [],
      });
    }

    const nowIso = new Date().toISOString();
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, name, slug, image_url, start_date, end_date, city, country, timezone")
      .in("id", sharedEventIds)
      .gte("start_date", nowIso)
      .order("start_date", { ascending: true });

    if (eventsError) {
      throw eventsError;
    }

    const items = (events || []) as MutualEventItem[];

    return NextResponse.json({
      count: items.length,
      preview: items.slice(0, PREVIEW_LIMIT),
      items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get mutual events" },
      { status: 500 }
    );
  }
}
