/**
 * Delete every event whose start_date falls in December 2026 (UTC).
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
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const fromIso = "2026-12-01T00:00:00.000Z";
  const toIso = "2027-01-01T00:00:00.000Z";
  console.log("DRY_RUN =", DRY_RUN);
  console.log("Window:", fromIso, "->", toIso);

  const { data: targets, error } = await supabase
    .from("events")
    .select("id, name, start_date, city, country, is_major")
    .gte("start_date", fromIso)
    .lt("start_date", toIso)
    .order("start_date", { ascending: true });
  if (error) {
    console.error("Lookup failed:", error.message);
    process.exit(1);
  }

  console.log("Matched:", targets?.length ?? 0);
  for (const e of targets ?? []) {
    console.log(
      `  ${e.start_date} | ${e.name} | ${e.city ?? "—"}, ${e.country ?? "—"} | major=${e.is_major}`
    );
  }

  const ids = (targets ?? []).map((e) => e.id);
  if (!ids.length) {
    console.log("Nothing to delete.");
    return;
  }
  if (DRY_RUN) {
    console.log("DRY_RUN: would delete", ids.length, "events");
    return;
  }

  const { error: delErr } = await supabase.from("events").delete().in("id", ids);
  if (delErr) {
    console.error("Delete failed:", delErr.message);
    process.exit(1);
  }
  console.log("Deleted", ids.length, "events");

  const { data: upcoming } = await supabase
    .from("events")
    .select("id, name, slug, start_date, end_date, city, country, is_major")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true });
  console.log("\nRemaining upcoming:", upcoming?.length ?? 0);
  for (const e of upcoming ?? []) {
    const tag = e.is_major ? "[MAJOR]" : "[local]";
    console.log(
      `  ${tag} ${e.start_date} -> ${e.end_date} | ${e.name} | ${e.city ?? "—"}, ${e.country ?? "—"}`
    );
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message || err);
  process.exit(1);
});
