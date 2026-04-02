/**
 * Backfill event_organizers: for each event with owner_type = 'user' and owner_id set,
 * ensure there is a row in event_organizers with profile_id = owner_id.
 * Run: node scripts/backfill-event-organizers.mjs [--dry-run]
 * Env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from .env or .env.local)
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env then .env.local (local overrides)
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env or .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

async function main() {
  console.error("[backfill-organizers] Fetching events with owner_type = 'user' and owner_id not null...");
  const { data: events, error: fetchErr } = await supabase
    .from("events")
    .select("id, owner_id")
    .eq("owner_type", "user")
    .not("owner_id", "is", null);

  if (fetchErr) {
    console.error("[backfill-organizers] Error:", fetchErr.message);
    process.exit(1);
  }

  const list = events || [];
  console.error("[backfill-organizers] Found %d events with user owner", list.length);
  if (dryRun) console.error("[backfill-organizers] DRY RUN - no writes");

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const ev of list) {
    const { data: existing } = await supabase
      .from("event_organizers")
      .select("id")
      .eq("event_id", ev.id)
      .eq("profile_id", ev.owner_id)
      .maybeSingle();

    if (existing) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.error("[backfill-organizers] Would add organizer event_id=%s profile_id=%s", ev.id, ev.owner_id);
      inserted += 1;
      continue;
    }

    const { error: insertErr } = await supabase.from("event_organizers").insert({
      event_id: ev.id,
      profile_id: ev.owner_id,
      position: 0,
    });

    if (insertErr) {
      console.error("[backfill-organizers] Insert error event_id=%s: %s", ev.id, insertErr.message);
      errors += 1;
      continue;
    }

    inserted += 1;
  }

  console.error("[backfill-organizers] Done. inserted=%d skipped=%d errors=%d", inserted, skipped, errors);
  process.stdout.write(JSON.stringify({ inserted, skipped, errors }) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
