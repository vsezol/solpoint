/**
 * Read-only count of events considered "past":
 *   - end_date IS NOT NULL AND end_date < now()   (multi-day events that already ended)
 *   - end_date IS NULL AND start_date < now()     (one-day events that already happened)
 * Prints totals plus a sample for sanity check.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key);

async function main() {
  const nowIso = new Date().toISOString();
  console.log("Cutoff:", nowIso);

  const { count: totalCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true });
  console.log("Total events in DB:", totalCount);

  // Branch A: ended (end_date < now)
  const { count: endedCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .lt("end_date", nowIso);

  // Branch B: no end_date AND start_date < now
  const { count: startedNoEndCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .is("end_date", null)
    .lt("start_date", nowIso);

  console.log("Past with end_date < now :", endedCount);
  console.log("Past with end_date null & start_date < now :", startedNoEndCount);
  console.log("=> Total past to delete :", (endedCount ?? 0) + (startedNoEndCount ?? 0));

  const { data: sampleEnded } = await supabase
    .from("events")
    .select("id, name, start_date, end_date, is_major, luma_link")
    .lt("end_date", nowIso)
    .order("end_date", { ascending: false })
    .limit(5);
  console.log("\nSample past (end_date < now), latest 5:");
  for (const e of sampleEnded ?? []) {
    console.log(`  ${e.end_date} | ${e.name} | major=${e.is_major}`);
  }

  const { data: sampleNoEnd } = await supabase
    .from("events")
    .select("id, name, start_date, end_date, is_major, luma_link")
    .is("end_date", null)
    .lt("start_date", nowIso)
    .order("start_date", { ascending: false })
    .limit(5);
  console.log("\nSample past (end_date null, start_date < now), latest 5:");
  for (const e of sampleNoEnd ?? []) {
    console.log(`  ${e.start_date} | ${e.name} | major=${e.is_major}`);
  }

  // Sanity: make sure new targets are NOT in delete set
  const targets = [
    "https://luma.com/solanasummitgermany",
    "https://luma.com/breakpoint2026",
  ];
  for (const t of targets) {
    const { data } = await supabase
      .from("events")
      .select("id, name, start_date, end_date")
      .eq("luma_link", t);
    if (data?.length) {
      for (const e of data) {
        const past = (e.end_date && e.end_date < nowIso) ||
          (!e.end_date && e.start_date && e.start_date < nowIso);
        console.log(`\nTarget ${t}: ${e.name} | start=${e.start_date} end=${e.end_date} | past=${past}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
