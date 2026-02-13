import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  reverseGeocodeFromNominatim,
  delayMs,
} from "@/lib/geocoding/nominatim-reverse";

const LIMIT_PER_RUN = 30;
const NOMINATIM_DELAY_MS = 1100;

export async function POST() {
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

  const { data: rawEvents, error: fetchErr } = await supabase
    .from("events")
    .select("id, latitude, longitude, country, city, country_code")
    .not("luma_event_id", "is", null)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(LIMIT_PER_RUN * 2);

  const events = (rawEvents || []).filter(
    (e) =>
      e.country == null ||
      e.country === "" ||
      e.city == null ||
      e.city === "" ||
      e.country_code == null ||
      e.country_code === ""
  ).slice(0, LIMIT_PER_RUN);

  if (fetchErr) {
    return NextResponse.json(
      { error: fetchErr.message || "Failed to fetch events" },
      { status: 500 }
    );
  }

  let updated = 0;
  const errors: string[] = [];

  for (const ev of events) {
    const lat = Number(ev.latitude);
    const lng = Number(ev.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      errors.push(`Event ${ev.id}: invalid coordinates`);
      continue;
    }

    const result = await reverseGeocodeFromNominatim(lat, lng);

    if (!result) {
      errors.push(`Event ${ev.id}: geocode failed`);
      await delayMs(NOMINATIM_DELAY_MS);
      continue;
    }

    const { error: updateErr } = await supabase
      .from("events")
      .update({
        country: result.country ?? ev.country,
        city: result.city ?? ev.city,
        country_code: result.country_code ?? ev.country_code,
      })
      .eq("id", ev.id);

    if (updateErr) {
      errors.push(`Event ${ev.id}: ${updateErr.message}`);
    } else {
      updated += 1;
    }

    await delayMs(NOMINATIM_DELAY_MS);
  }

  return NextResponse.json(
    {
      updated,
      failed: errors.length,
      total_processed: events.length,
      errors: errors.slice(0, 10),
    },
    { status: 200 }
  );
}
