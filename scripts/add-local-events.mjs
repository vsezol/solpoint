/**
 * Insert 6 specific Luma events as LOCAL events (is_major = false), then
 * delete all past events.
 *
 * If an event already exists (matched by luma_link), update it in place.
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

const EVENTS = [
  {
    slug: "redotsclub-malaysia-kl-2nd-connect",
    name: "RedotsClub Malaysia: Second Connect in KL with Superteam MY",
    description:
      "Co-hosted with Superteam Malaysia. Onboarding session, RedotPay community segment, then games and community dinner at Carousel.",
    image_path: "uploads/cx/043eaeb3-f210-4ee9-b4b2-775339871134.png",
    country: "Malaysia",
    country_code: "MY",
    city: "Kuala Lumpur",
    start_date: "2026-06-05T10:00:00.000Z",
    end_date: "2026-06-05T13:00:00.000Z",
    timezone: "Asia/Kuala_Lumpur",
    luma_link: "https://luma.com/0zh3kq28",
  },
  {
    slug: "superteam-blkn-founders-villa-croatia",
    name: "Superteam BLKN | Founders Villa in Croatia",
    description:
      "Invite-only retreat on the Adriatic coast for ~30 selected founders from the Superteam Balkan community. Aug 10 - 21.",
    image_path: "uploads/ll/269e8067-199b-49e7-8575-81fa32d21423.png",
    country: "Croatia",
    country_code: "HR",
    city: "Split",
    start_date: "2026-08-10T08:00:00.000Z",
    end_date: "2026-08-21T15:00:00.000Z",
    timezone: "Europe/Zagreb",
    luma_link: "https://luma.com/founders-villa-split",
  },
  {
    slug: "toronto-solana-vibestation",
    name: "Toronto Solana VibeStation",
    description:
      "Superteam Canada co-working day for web3 builders, leaders and creatives. Every Friday in Toronto, 9:30 AM - 6:00 PM.",
    image_path: "event-covers/l2/d3220179-cb73-45af-96a5-b4614d3c1717.png",
    country: "Canada",
    country_code: "CA",
    city: "Toronto",
    start_date: "2026-05-29T13:30:00.000Z",
    end_date: "2026-05-29T22:00:00.000Z",
    timezone: "America/Toronto",
    luma_link: "https://luma.com/cjhk0k3b",
  },
  {
    slug: "monke-brunch-solana-summit-germany",
    name: "Monke Brunch @ Solana Summit Germany",
    description:
      "MonkeDAO Global community brunch alongside Solana Summit Germany. Verified MonkeDAO members access only.",
    image_path: "uploads/04/08266f13-e761-4359-ba46-612471ff4d9a.png",
    country: "Germany",
    country_code: "DE",
    city: "Berlin",
    start_date: "2026-06-14T09:00:00.000Z",
    end_date: "2026-06-14T11:00:00.000Z",
    timezone: "Europe/Berlin",
    luma_link: "https://luma.com/MonkeDAO-SSG26",
  },
  {
    slug: "house-of-sol-roundtable-rwa",
    name: "House of Sol Roundtable - RWA",
    description:
      "Real-World Asset Tokenisation, Compliance Infrastructure & DeFi Composability. Executive invite-only roundtable hosted by Superteam UK and Solana Foundation.",
    image_path: "uploads/qa/5bff8452-ffb9-4bff-9310-7589036207e1.jpg",
    country: "United Kingdom",
    country_code: "GB",
    city: "London",
    address: "23 Clerkenwell Grn, London EC1R 0NA, UK",
    venue_name: "Knotel at The Old Sessions House",
    start_date: "2026-06-04T16:30:00.000Z",
    end_date: "2026-06-04T18:30:00.000Z",
    timezone: "Europe/London",
    luma_link: "https://luma.com/HouseofSolRoundtables-RWA",
  },
  {
    slug: "solana-career-day-nyc",
    name: "Solana Career Day NYC",
    description:
      "Career sessions, hands-on building, and a community mixer. Hosted by Superteam Talent, Blueshift, and Skyline. Doors 3:00 PM - 10:00 PM end.",
    image_path: "uploads/yu/19cfa79d-1d14-46fc-ae35-03f0de9c2f24.png",
    country: "United States",
    country_code: "US",
    city: "New York",
    start_date: "2026-06-04T19:00:00.000Z",
    end_date: "2026-06-05T02:00:00.000Z",
    timezone: "America/New_York",
    luma_link: "https://luma.com/n09ixw34",
  },
];

const IMAGE_CDN_BASE = "https://images.lumacdn.com/";

function buildImageUrl(path) {
  return `${IMAGE_CDN_BASE}${path}`;
}

async function getUniqueSlug(base) {
  let slug = base;
  let n = 0;
  while (true) {
    const { data } = await supabase
      .from("events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function upsertEvent(e) {
  const { data: existing } = await supabase
    .from("events")
    .select("id, name, slug")
    .eq("luma_link", e.luma_link)
    .maybeSingle();

  const row = {
    name: e.name,
    description: e.description,
    image_url: buildImageUrl(e.image_path),
    country: e.country,
    country_code: e.country_code,
    city: e.city,
    address: e.address ?? null,
    venue_name: e.venue_name ?? null,
    start_date: e.start_date,
    end_date: e.end_date,
    timezone: e.timezone,
    event_type: "official",
    visibility: "public",
    is_paid: false,
    is_online: false,
    is_major: false,
    luma_link: e.luma_link,
    owner_type: "user",
    owner_id: null,
    socials: {},
    contacts: {},
    attendees_count: 0,
  };

  if (existing) {
    if (DRY_RUN) {
      console.log(`  [${e.slug}] would UPDATE id=${existing.id}`);
      return;
    }
    const { error: upErr } = await supabase
      .from("events")
      .update(row)
      .eq("id", existing.id);
    if (upErr) throw new Error(`Update ${e.slug} failed: ${upErr.message}`);
    console.log(`  [${e.slug}] updated id=${existing.id}`);
    return;
  }

  const finalSlug = await getUniqueSlug(e.slug);
  row.slug = finalSlug;

  if (DRY_RUN) {
    console.log(`  [${e.slug}] would INSERT (slug=${finalSlug})`);
    return;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("events")
    .insert(row)
    .select("id")
    .single();
  if (insErr) throw new Error(`Insert ${e.slug} failed: ${insErr.message}`);
  console.log(`  [${e.slug}] inserted id=${inserted.id}`);
}

async function deletePastEvents() {
  const nowIso = new Date().toISOString();
  console.log("\nDeleting past events, cutoff:", nowIso);

  const { data: pastEnded } = await supabase
    .from("events")
    .select("id, name, start_date, end_date")
    .lt("end_date", nowIso);
  const { data: pastNoEnd } = await supabase
    .from("events")
    .select("id, name, start_date, end_date")
    .is("end_date", null)
    .lt("start_date", nowIso);

  const ids = [...(pastEnded ?? []), ...(pastNoEnd ?? [])].map((e) => e.id);
  console.log(
    "  past(end<now):",
    pastEnded?.length ?? 0,
    "/ past(no end, start<now):",
    pastNoEnd?.length ?? 0,
    "/ total:",
    ids.length
  );
  if (!ids.length) return;
  if (DRY_RUN) {
    console.log("  DRY_RUN: would delete", ids.length);
    return;
  }
  const CHUNK = 100;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { error } = await supabase.from("events").delete().in("id", chunk);
    if (error) throw new Error(`Delete chunk ${i} failed: ${error.message}`);
    console.log(`  deleted ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
  }
}

async function finalReport() {
  console.log("\n=== Final state ===");
  const { count: totalCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true });
  console.log("Total events:", totalCount);

  const { data: majors } = await supabase
    .from("events")
    .select("id, name, slug, start_date, city, country")
    .eq("is_major", true)
    .order("start_date", { ascending: true });
  console.log("\nMajor events:", majors?.length ?? 0);
  for (const e of majors ?? []) {
    console.log(`  ${e.start_date} | ${e.name} | ${e.city}, ${e.country} | slug=${e.slug}`);
  }

  const { data: upcoming } = await supabase
    .from("events")
    .select("id, name, slug, start_date, end_date, city, country, is_major")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true });
  console.log("\nAll upcoming:");
  for (const e of upcoming ?? []) {
    const tag = e.is_major ? "[MAJOR]" : "[local]";
    console.log(
      `  ${tag} ${e.start_date} -> ${e.end_date} | ${e.name} | ${e.city}, ${e.country}`
    );
  }
}

async function main() {
  console.log("DRY_RUN =", DRY_RUN);
  console.log("\n[1] Upserting 6 local events...");
  for (const e of EVENTS) {
    await upsertEvent(e);
  }
  await deletePastEvents();
  await finalReport();
}

main().catch((err) => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});
