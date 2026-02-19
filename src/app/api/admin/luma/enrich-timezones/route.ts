import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isCronRequest } from "@/lib/cron-auth";
import { NextRequest, NextResponse } from "next/server";
import {
  isValidIanaTimezone,
  normalizeCoordinates,
  resolveTimezoneWithSource,
} from "@/lib/luma/timezone";

const LIMIT_PER_RUN = 100;

type EventRow = {
  id: string;
  luma_event_id: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
};

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

  const { data: rawEvents, error: fetchErr } = await supabase
    .from("events")
    .select("id, luma_event_id, latitude, longitude, timezone")
    .not("luma_event_id", "is", null)
    .limit(LIMIT_PER_RUN * 4);

  if (fetchErr) {
    return NextResponse.json(
      { error: fetchErr.message || "Failed to fetch events" },
      { status: 500 }
    );
  }

  const candidateEvents = (rawEvents || [])
    .map((event) => event as EventRow)
    .filter((event) => {
      const normalizedCoords = normalizeCoordinates(event.latitude, event.longitude);
      const hasValidTimezone = isValidIanaTimezone(event.timezone);
      const needsTimezone = !hasValidTimezone;
      const needsCoordsCleanup = normalizedCoords.wasZeroZero;
      return needsTimezone || needsCoordsCleanup;
    })
    .slice(0, LIMIT_PER_RUN);

  const lumaIds = [
    ...new Set(
      candidateEvents
        .map((event) => event.luma_event_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let lumaMap = new Map<string, string | null>();
  if (lumaIds.length > 0) {
    const { data: lumaEvents, error: lumaFetchErr } = await supabase
      .from("luma_events")
      .select("id, raw_date_time_display")
      .in("id", lumaIds);

    if (lumaFetchErr) {
      return NextResponse.json(
        { error: lumaFetchErr.message || "Failed to fetch luma source data" },
        { status: 500 }
      );
    }

    lumaMap = new Map(
      (lumaEvents || []).map((row) => [row.id, row.raw_date_time_display || null])
    );
  }

  let updatedTimezone = 0;
  let leftNull = 0;
  let coordsCleaned = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const event of candidateEvents) {
    const normalizedCoords = normalizeCoordinates(event.latitude, event.longitude);
    const hasValidTimezone = isValidIanaTimezone(event.timezone);
    const rawDateTimeDisplay = event.luma_event_id
      ? lumaMap.get(event.luma_event_id) || null
      : null;
    const resolution = resolveTimezoneWithSource({
      lat: normalizedCoords.lat,
      lng: normalizedCoords.lng,
      rawDateTimeDisplay,
    });

    const updates: {
      latitude?: number | null;
      longitude?: number | null;
      timezone?: string | null;
    } = {};

    if (normalizedCoords.wasZeroZero) {
      updates.latitude = null;
      updates.longitude = null;
    }

    if (!hasValidTimezone) {
      updates.timezone = resolution.timezone;
    }

    if (Object.keys(updates).length === 0) {
      continue;
    }

    const { error: updateErr } = await supabase
      .from("events")
      .update(updates)
      .eq("id", event.id);

    if (updateErr) {
      failed += 1;
      errors.push(`Event ${event.id}: ${updateErr.message}`);
      continue;
    }

    if (normalizedCoords.wasZeroZero) {
      coordsCleaned += 1;
    }

    if (!hasValidTimezone) {
      if (updates.timezone) {
        updatedTimezone += 1;
      } else {
        leftNull += 1;
      }
    }
  }

  return NextResponse.json(
    {
      processed: candidateEvents.length,
      updated_timezone: updatedTimezone,
      left_null: leftNull,
      coords_cleaned: coordsCleaned,
      failed,
      errors: errors.slice(0, 10),
    },
    { status: 200 }
  );
}
