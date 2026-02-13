/**
 * Sync luma_events → events (and event_organizers from luma_event_organizers).
 * Creates or updates events with luma_event_id set, owner_id null (external).
 * Run: node scripts/luma-sync-to-events.mjs [--dry-run] [--limit N]
 * Env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || 50 : 500;

function slugFromTitleAndId(title, id) {
  const base = (title || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const shortId = id.replace(/-/g, "").slice(0, 8);
  return `${base}-${shortId}`;
}

async function getUniqueEventSlug(baseSlug) {
  let slug = baseSlug;
  let n = 0;
  while (true) {
    const { data } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }
}

async function main() {
  console.error("[luma-sync] Fetching luma_events (limit %d)...", limit);
  const { data: lumaEvents, error: fetchErr } = await supabase
    .from("luma_events")
    .select("id, url, title, description, start_at, end_at, location, address, location_lat, location_lng, image_url, participant_count, raw_date_time_display")
    .not("url", "is", null)
    .limit(limit)
    .order("scraped_at", { ascending: false });

  if (fetchErr) {
    console.error("[luma-sync] Error:", fetchErr.message);
    process.exit(1);
  }

  console.error("[luma-sync] Found %d luma_events", lumaEvents?.length ?? 0);
  if (dryRun) console.error("[luma-sync] DRY RUN - no writes");

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const le of lumaEvents || []) {
    const { data: byLumaId } = await supabase.from("events").select("id").eq("luma_event_id", le.id).maybeSingle();
    const { data: byLink } = await supabase.from("events").select("id").eq("luma_link", le.url).maybeSingle();
    const existing = byLumaId || byLink;

    if (existing) {
      skipped += 1;
      continue;
    }

    const baseSlug = slugFromTitleAndId(le.title, le.id);
    const slug = await getUniqueEventSlug(baseSlug);

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
      latitude: le.location_lat ?? 0,
      longitude: le.location_lng ?? 0,
      start_date: le.start_at ?? new Date().toISOString(),
      end_date: le.end_at ?? null,
      timezone: le.raw_date_time_display ?? null,
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

    if (dryRun) {
      console.error("[luma-sync] Would create event:", eventRow.slug, eventRow.name);
      created += 1;
      continue;
    }

    const { data: newEvent, error: insertErr } = await supabase
      .from("events")
      .insert(eventRow)
      .select("id")
      .single();

    if (insertErr) {
      console.error("[luma-sync] Insert error for", le.url, insertErr.message);
      errors += 1;
      continue;
    }

    created += 1;

    const { data: lumaOrgs } = await supabase
      .from("luma_event_organizers")
      .select("user_id")
      .eq("event_id", le.id);

    if (lumaOrgs?.length) {
      for (const o of lumaOrgs) {
        await supabase.from("event_organizers").insert({
          event_id: newEvent.id,
          luma_user_id: o.user_id,
          position: 0,
        });
      }
      console.error("[luma-sync] Created event %s + %d organizers", newEvent.id, lumaOrgs.length);
    }
  }

  console.error("[luma-sync] Done. created=%d skipped=%d errors=%d", created, skipped, errors);
  process.stdout.write(JSON.stringify({ created, skipped, errors }) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
