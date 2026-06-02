/**
 * One-off curation script for /events showcase:
 *   1) UPDATE Solana Breakpoint 2026 — correct dates / location / image / is_major=true
 *   2) INSERT Solana Summit Germany (or UPDATE if already present), is_major=true
 *   3) UNSET is_major on the two December 2026 majors (Tokenizing RWA + LazorKit)
 *      so Summit + Breakpoint take the two top slots cleanly.
 *   4) DELETE every past event (end_date < now OR (end_date IS NULL AND start_date < now)).
 *      Related rows in event_members/event_organizers/event_speakers/meeting_requests/...
 *      are removed via ON DELETE CASCADE.
 *
 * Order matters: Breakpoint MUST be fixed first, because its current bogus
 * start_date=2026-04-02 would otherwise put it into the delete bucket.
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

async function getUniqueSlug(base) {
  let slug = base;
  let n = 0;
  while (true) {
    const { data } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function step1FixBreakpoint() {
  console.log("\n[1] Fix Solana Breakpoint 2026");
  const { data: existing, error } = await supabase
    .from("events")
    .select("id, name, slug, start_date, end_date, is_major, city, country, image_url")
    .eq("luma_link", "https://luma.com/breakpoint2026")
    .maybeSingle();

  if (error) throw new Error("Lookup failed: " + error.message);
  if (!existing) {
    console.log("  Not found — will create instead.");
    return null;
  }

  console.log("  Found:", existing.id, "current start=" + existing.start_date);

  const patch = {
    name: "Solana Breakpoint 2026",
    image_url:
      "https://images.lumacdn.com/event-covers/rp/f80e679e-441f-4cd0-9f62-ffb131cf68bb.png",
    country: "United Kingdom",
    country_code: "GB",
    city: "London",
    address: "Hammersmith Rd, London W14 8UX, UK",
    venue_name: "Olympia London",
    start_date: "2026-11-15T16:00:00.000Z",
    end_date: "2026-11-17T19:00:00.000Z",
    timezone: "Europe/London",
    visibility: "public",
    is_major: true,
  };

  if (DRY_RUN) {
    console.log("  DRY_RUN patch:", patch);
    return existing.id;
  }

  const { error: updErr } = await supabase
    .from("events")
    .update(patch)
    .eq("id", existing.id);
  if (updErr) throw new Error("Update Breakpoint failed: " + updErr.message);
  console.log("  Updated OK");
  return existing.id;
}

async function step2UpsertSummitGermany() {
  console.log("\n[2] Upsert Solana Summit Germany");

  const lumaLink = "https://luma.com/solanasummitgermany";
  const { data: existing, error } = await supabase
    .from("events")
    .select("id, slug, name")
    .eq("luma_link", lumaLink)
    .maybeSingle();
  if (error) throw new Error("Lookup failed: " + error.message);

  const row = {
    name: "Solana Summit Germany",
    description:
      "The largest Solana conference Germany has ever seen. Founders, developers, investors, institutions, and creators come together for a one-day summit on the rise of Internet Capital Markets - and why Solana is the infrastructure powering them. Powered by Superteam Germany. Free entry, registration required.",
    image_url:
      "https://images.lumacdn.com/event-covers/k9/ce66de96-5346-464b-a262-c87f4e292b37.png",
    country: "Germany",
    country_code: "DE",
    city: "Berlin",
    address: "Stralauer Allee 2, 10245 Berlin, Germany",
    venue_name: "Spreespeicher Eventlocation",
    latitude: 52.503,
    longitude: 13.455,
    start_date: "2026-06-13T08:00:00.000Z",
    end_date: "2026-06-13T20:00:00.000Z",
    timezone: "Europe/Berlin",
    event_type: "official",
    visibility: "public",
    is_paid: false,
    is_online: false,
    is_major: true,
    luma_link: lumaLink,
    owner_type: "user",
    owner_id: null,
    socials: {},
    contacts: {},
    attendees_count: 0,
  };

  if (existing) {
    console.log("  Existing row:", existing.id, "— will update");
    if (DRY_RUN) {
      console.log("  DRY_RUN update:", row);
      return existing.id;
    }
    const { error: upErr } = await supabase.from("events").update(row).eq("id", existing.id);
    if (upErr) throw new Error("Update Summit failed: " + upErr.message);
    console.log("  Updated OK");
    return existing.id;
  }

  const slug = await getUniqueSlug("solana-summit-germany");
  row.slug = slug;

  if (DRY_RUN) {
    console.log("  DRY_RUN insert (slug=" + slug + "):", row);
    return null;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("events")
    .insert(row)
    .select("id")
    .single();
  if (insErr) throw new Error("Insert Summit failed: " + insErr.message);
  console.log("  Inserted OK, id=" + inserted.id + ", slug=" + slug);
  return inserted.id;
}

async function step3UnsetOtherMajors(keepIds) {
  console.log("\n[3] Unset is_major on every event NOT in keep list");
  const { data: currentMajors, error } = await supabase
    .from("events")
    .select("id, name")
    .eq("is_major", true);
  if (error) throw new Error("Lookup majors failed: " + error.message);

  const toClear = (currentMajors ?? []).filter((e) => !keepIds.includes(e.id));
  console.log("  Currently major:", currentMajors?.length ?? 0, "/ will clear:", toClear.length);
  for (const e of toClear) console.log("    - " + e.name + " (" + e.id + ")");

  if (toClear.length === 0) return;
  if (DRY_RUN) {
    console.log("  DRY_RUN: would clear", toClear.length, "ids");
    return;
  }

  const { error: updErr } = await supabase
    .from("events")
    .update({ is_major: false })
    .in("id", toClear.map((e) => e.id));
  if (updErr) throw new Error("Bulk unset major failed: " + updErr.message);
  console.log("  Cleared OK");
}

async function step4DeletePastEvents() {
  console.log("\n[4] Delete past events");
  const nowIso = new Date().toISOString();
  console.log("  Cutoff:", nowIso);

  const { data: pastEnded, error: e1 } = await supabase
    .from("events")
    .select("id, name, start_date, end_date")
    .lt("end_date", nowIso);
  if (e1) throw new Error("Lookup past(ended) failed: " + e1.message);

  const { data: pastNoEnd, error: e2 } = await supabase
    .from("events")
    .select("id, name, start_date, end_date")
    .is("end_date", null)
    .lt("start_date", nowIso);
  if (e2) throw new Error("Lookup past(no-end) failed: " + e2.message);

  const all = [...(pastEnded ?? []), ...(pastNoEnd ?? [])];
  const ids = all.map((e) => e.id);
  console.log(
    "  Past with end_date<now :",
    pastEnded?.length ?? 0,
    "/ no-end start<now :",
    pastNoEnd?.length ?? 0,
    "/ total to delete :",
    ids.length
  );

  if (ids.length === 0) return;
  if (DRY_RUN) {
    console.log("  DRY_RUN: would delete", ids.length, "events");
    return;
  }

  // Supabase has URL length / ANY-array limits; delete in chunks.
  const CHUNK = 100;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { error: delErr } = await supabase.from("events").delete().in("id", chunk);
    if (delErr) throw new Error("Delete chunk " + i + " failed: " + delErr.message);
    deleted += chunk.length;
    console.log("  Deleted " + deleted + "/" + ids.length);
  }
  console.log("  Done. Total deleted: " + deleted);
}

async function finalReport() {
  console.log("\n=== Final state ===");
  const { count: totalCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true });
  console.log("Total events:", totalCount);

  const { data: majors } = await supabase
    .from("events")
    .select("id, name, slug, start_date, end_date, city, country, is_major")
    .eq("is_major", true)
    .order("start_date", { ascending: true });
  console.log("Major events:", majors?.length ?? 0);
  for (const e of majors ?? []) {
    console.log(`  - ${e.name} | ${e.start_date} -> ${e.end_date} | ${e.city}, ${e.country} | slug=${e.slug}`);
  }

  const { data: upcoming } = await supabase
    .from("events")
    .select("id, name, start_date")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(20);
  console.log("\nUpcoming (first 20):");
  for (const e of upcoming ?? []) {
    console.log(`  ${e.start_date} | ${e.name}`);
  }
}

async function main() {
  console.log("DRY_RUN =", DRY_RUN);

  const breakpointId = await step1FixBreakpoint();
  const summitId = await step2UpsertSummitGermany();

  const keepIds = [breakpointId, summitId].filter(Boolean);
  await step3UnsetOtherMajors(keepIds);

  await step4DeletePastEvents();
  await finalReport();
}

main().catch((e) => {
  console.error("\nFAILED:", e.message || e);
  process.exit(1);
});
