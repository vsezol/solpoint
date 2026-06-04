/**
 * Read-only inspection of current `events` state needed for major-events curation.
 * - Lists all current major events (is_major = true).
 * - Searches for Solana Breakpoint / Solana Summit Germany by name/luma_link.
 * Run: node scripts/check-major-events.mjs
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log("=== Current major events (is_major = true) ===");
  const { data: majors, error: majorsErr } = await supabase
    .from("events")
    .select("id, name, slug, city, country, start_date, end_date, is_major, luma_link, image_url")
    .eq("is_major", true)
    .order("start_date", { ascending: true });

  if (majorsErr) {
    console.error("Error fetching majors:", majorsErr.message);
    process.exit(1);
  }

  if (!majors?.length) {
    console.log("  (none)");
  } else {
    for (const e of majors) {
      console.log(`  - ${e.name}`);
      console.log(`      id=${e.id}`);
      console.log(`      slug=${e.slug}`);
      console.log(`      ${e.city ?? "?"}, ${e.country ?? "?"}`);
      console.log(`      start_date=${e.start_date}`);
      console.log(`      luma_link=${e.luma_link}`);
      console.log("");
    }
  }

  const lumaUrls = [
    "https://luma.com/solanasummitgermany",
    "https://luma.com/breakpoint2026",
  ];
  const nameQueries = ["Solana Summit", "Solana Breakpoint", "Breakpoint 2026"];

  console.log("\n=== Search for matching events ===");
  for (const lumaUrl of lumaUrls) {
    const { data, error } = await supabase
      .from("events")
      .select("id, name, slug, is_major, luma_link, start_date, city, country")
      .or(`luma_link.ilike.%${lumaUrl.split("/").pop()}%,luma_link.eq.${lumaUrl}`);
    if (error) {
      console.error(`Error searching luma_link for ${lumaUrl}:`, error.message);
      continue;
    }
    console.log(`luma_link ~ ${lumaUrl}:`, data?.length ?? 0, "match(es)");
    for (const e of data ?? []) {
      console.log(`  - ${e.name} (is_major=${e.is_major}, slug=${e.slug}, id=${e.id})`);
      console.log(`      luma_link=${e.luma_link}`);
    }
  }

  for (const q of nameQueries) {
    const { data, error } = await supabase
      .from("events")
      .select("id, name, slug, is_major, luma_link, start_date, city, country")
      .ilike("name", `%${q}%`);
    if (error) {
      console.error(`Error searching name for "${q}":`, error.message);
      continue;
    }
    console.log(`name ilike "%${q}%":`, data?.length ?? 0, "match(es)");
    for (const e of data ?? []) {
      console.log(`  - ${e.name} (is_major=${e.is_major}, slug=${e.slug}, id=${e.id})`);
      console.log(`      luma_link=${e.luma_link}`);
      console.log(`      start_date=${e.start_date} / ${e.city}, ${e.country}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
