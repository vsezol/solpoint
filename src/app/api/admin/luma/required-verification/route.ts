import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function isEmpty(s: string | null | undefined): boolean {
  return s == null || String(s).trim() === "";
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }

  const { data: events, error: eventsErr } = await supabase
    .from("events")
    .select("id, name, slug, start_date, description, image_url, country, city, address, luma_link, luma_event_id")
    .not("luma_event_id", "is", null)
    .eq("required_verification_dismissed", false);

  if (eventsErr) {
    return NextResponse.json(
      { error: eventsErr.message || "Failed to fetch events" },
      { status: 500 }
    );
  }

  const eventIds = (events || []).map((e) => e.id);
  const organizerCounts: Record<string, number> = {};
  if (eventIds.length > 0) {
    const { data: orgRows } = await supabase
      .from("event_organizers")
      .select("event_id")
      .in("event_id", eventIds);
    for (const row of orgRows || []) {
      organizerCounts[row.event_id] = (organizerCounts[row.event_id] ?? 0) + 1;
    }
  }

  const list = (events || []).filter((e) => {
    const missingName = isEmpty(e.name);
    const missingDate = e.start_date == null;
    const missingDescription = isEmpty(e.description);
    const missingImage = isEmpty(e.image_url);
    const missingCountry = isEmpty(e.country);
    const missingCity = isEmpty(e.city);
    const missingAddress = isEmpty(e.address);
    const missingHosts = (organizerCounts[e.id] ?? 0) === 0;
    return (
      missingName ||
      missingDate ||
      missingDescription ||
      missingImage ||
      missingCountry ||
      missingCity ||
      missingAddress ||
      missingHosts
    );
  });

  return NextResponse.json({ events: list }, { status: 200 });
}
