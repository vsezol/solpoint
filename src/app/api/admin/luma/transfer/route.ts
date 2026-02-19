import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isCronRequest } from "@/lib/cron-auth";
import { NextRequest, NextResponse } from "next/server";
import {
  normalizeCoordinates,
  resolveTimezoneWithSource,
} from "@/lib/luma/timezone";

const LIMIT = 500;

function slugFromTitleAndId(title: string | null, id: string): string {
  const base = (title || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const shortId = id.replace(/-/g, "").slice(0, 8);
  return `${base}-${shortId}`;
}

export async function POST(request: NextRequest) {
  const useCron = isCronRequest(request);
  const supabase = useCron ? createServiceRoleClient() : await createClient();

  if (!useCron) {
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
  }

  const { data: lumaEvents, error: fetchErr } = await supabase
    .from("luma_events")
    .select("id, url, title, description, start_at, end_at, location, address, location_lat, location_lng, image_url, participant_count, raw_date_time_display")
    .not("url", "is", null)
    .limit(LIMIT)
    .order("scraped_at", { ascending: false });

  if (fetchErr) {
    return NextResponse.json(
      { error: fetchErr.message || "Failed to fetch luma_events" },
      { status: 500 }
    );
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;
  let timezoneResolved = 0;
  let timezoneFallbackOffset = 0;
  let timezoneMissing = 0;
  let coordsNullifiedZeroZero = 0;

  for (const le of lumaEvents || []) {
    const { data: byLumaId } = await supabase
      .from("events")
      .select("id")
      .eq("luma_event_id", le.id)
      .maybeSingle();
    const { data: byLink } = await supabase
      .from("events")
      .select("id")
      .eq("luma_link", le.url)
      .maybeSingle();
    const existing = byLumaId || byLink;

    if (existing) {
      skipped += 1;
      continue;
    }

    let slug = slugFromTitleAndId(le.title, le.id);
    let n = 0;
    for (;;) {
      const { data: slugTaken } = await supabase
        .from("events")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!slugTaken) break;
      n += 1;
      slug = `${slugFromTitleAndId(le.title, le.id)}-${n}`;
    }

    const normalizedCoords = normalizeCoordinates(
      le.location_lat,
      le.location_lng
    );
    const timezoneResolution = resolveTimezoneWithSource({
      lat: normalizedCoords.lat,
      lng: normalizedCoords.lng,
      rawDateTimeDisplay: le.raw_date_time_display ?? null,
    });

    if (normalizedCoords.wasZeroZero) {
      coordsNullifiedZeroZero += 1;
    }

    if (timezoneResolution.source === "coords") {
      timezoneResolved += 1;
    } else if (timezoneResolution.source === "gmt_offset") {
      timezoneFallbackOffset += 1;
    } else {
      timezoneMissing += 1;
    }

    const eventRow = {
      name: le.title || "Untitled Event",
      description: le.description ?? null,
      image_url: le.image_url ?? null,
      slug,
      country: null,
      country_code: null,
      city: null,
      address: le.address ?? null,
      venue_name: le.location ?? null,
      latitude: normalizedCoords.lat,
      longitude: normalizedCoords.lng,
      start_date: le.start_at ?? new Date().toISOString(),
      end_date: le.end_at ?? null,
      timezone: timezoneResolution.timezone,
      event_type: "official",
      visibility: "public",
      is_paid: false,
      is_online: false,
      socials: {},
      contacts: {},
      luma_link: le.url,
      luma_event_id: le.id,
      owner_type: "user",
      owner_id: null,
      attendees_count: le.participant_count ?? 0,
    };

    const { data: newEvent, error: insertErr } = await supabase
      .from("events")
      .insert(eventRow)
      .select("id")
      .single();

    if (insertErr) {
      errors += 1;
      continue;
    }

    created += 1;

    const { data: lumaOrgs } = await supabase
      .from("luma_event_organizers")
      .select("user_id")
      .eq("event_id", le.id);

    if (lumaOrgs?.length && newEvent) {
      for (const o of lumaOrgs) {
        await supabase.from("event_organizers").insert({
          event_id: newEvent.id,
          luma_user_id: o.user_id,
          position: 0,
        });
      }
    }
  }

  return NextResponse.json(
    {
      created,
      skipped,
      errors,
      timezone_resolved: timezoneResolved,
      timezone_fallback_offset: timezoneFallbackOffset,
      timezone_missing: timezoneMissing,
      coords_nullified_zero_zero: coordsNullifiedZeroZero,
    },
    { status: 200 }
  );
}
