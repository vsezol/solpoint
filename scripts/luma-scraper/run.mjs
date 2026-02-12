/**
 * Luma scraper (own): popup-based flow. Opens calendar, finds cards in .timeline .card-wrapper,
 * clicks each card to open event popup, parses metadata (cover image → META_PARSED), optionally
 * clicks One-Click CTA and parses guests. Writes to DB when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set.
 *
 * Run: npm run luma-scraper:run
 * Or: node scripts/luma-scraper/run.mjs [calendarSlug] [maxEvents]
 * Env: LUMA_CALENDAR, LUMA_MAX_EVENTS, LUMA_PARSE_GUESTS=1, LUMA_HEADLESS=1, LUMA_SCROLL_STEPS
 *
 * Output: one JSON line to stdout. Logs to stderr.
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const AUTH_DIR = path.join(process.cwd(), "data", "luma-scraper");
const AUTH_STATE_PATH = path.join(AUTH_DIR, "auth-state.json");
const RESULTS_DIR = path.join(process.cwd(), "data", "luma-scraper-results");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min, max) => delay(min + Math.random() * (max - min));

const DELAY_BETWEEN_CLICKS_MS = [800, 1600];
const DELAY_BETWEEN_EVENTS_MS = [1200, 2500];

// CTA button: click only if one-click registration (not "Request participation")
const CTA_CLICK_PHRASES = [
  "One-Click Apply",
  "One-Click RSVP",
  "Регистрация в один клик",
  "Подать заявку в один клик",
];
const CTA_SKIP_PHRASES = ["Запросить участие", "Request participation"];

function log(...args) {
  const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  process.stderr.write(`[luma-scraper] ${msg}\n`);
}

function getArgs() {
  const calendar = process.env.LUMA_CALENDAR || process.argv[2] || "superteam";
  const maxEvents = Math.min(
    parseInt(process.env.LUMA_MAX_EVENTS || process.argv[3] || "30", 10) || 30,
    100
  );
  const headless = process.env.LUMA_HEADLESS === "1" || process.env.LUMA_HEADLESS === "true";
  const parseGuests = process.env.LUMA_PARSE_GUESTS === "1" || process.env.LUMA_PARSE_GUESTS === "true";
  return { calendar, maxEvents, headless, parseGuests };
}

async function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, key);
  } catch (e) {
    log("Supabase init skip:", e.message);
    return null;
  }
}

async function saveEventDiscovered(supabase, url, calendarSlug) {
  if (!supabase) return;
  try {
    await supabase.from("luma_events").upsert(
      {
        url,
        calendar_slug: calendarSlug,
        status: "DISCOVERED",
        last_attempt_at: new Date().toISOString(),
      },
      { onConflict: "url" }
    );
  } catch (e) {
    log("DB save DISCOVERED error:", e.message);
  }
}

async function updateEventMeta(supabase, url, payload) {
  if (!supabase) return;
  try {
    await supabase.from("luma_events").update(payload).eq("url", url);
  } catch (e) {
    log("DB update META error:", e.message);
  }
}

async function updateEventJoined(supabase, url) {
  if (!supabase) return;
  try {
    await supabase.from("luma_events").update({ status: "JOINED", last_attempt_at: new Date().toISOString() }).eq("url", url);
  } catch (e) {
    log("DB update JOINED error:", e.message);
  }
}

async function updateEventGuestsParsed(supabase, url) {
  if (!supabase) return;
  try {
    await supabase
      .from("luma_events")
      .update({ status: "GUESTS_PARSED", guests_parsed_at: new Date().toISOString(), last_attempt_at: new Date().toISOString() })
      .eq("url", url);
  } catch (e) {
    log("DB update GUESTS_PARSED error:", e.message);
  }
}

async function upsertGuests(supabase, eventUrl, guests) {
  if (!supabase || !guests.length) return;
  try {
    const { data: eventRow } = await supabase.from("luma_events").select("id").eq("url", eventUrl).single();
    if (!eventRow) return;
    const eventId = eventRow.id;
    const origin = "https://luma.com";
    for (const g of guests) {
      const profileUrl = g.lumaProfileUrl.startsWith("http") ? g.lumaProfileUrl : origin + (g.lumaProfileUrl.startsWith("/") ? g.lumaProfileUrl : "/" + g.lumaProfileUrl);
      await supabase.from("luma_users").upsert(
        {
          luma_profile_url: profileUrl,
          name: g.name || null,
          avatar: g.avatar || null,
          social_links: g.socials || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "luma_profile_url" }
      );
      const { data: userRow } = await supabase.from("luma_users").select("id").eq("luma_profile_url", profileUrl).single();
      if (userRow) {
        await supabase.from("luma_event_attendees").upsert(
          { event_id: eventId, user_id: userRow.id, scraped_at: new Date().toISOString() },
          { onConflict: "event_id,user_id" }
        );
      }
    }
  } catch (e) {
    log("DB upsert guests error:", e.message);
  }
}

/**
 * Parse metadata from event popup. For now: find cover image; later add title, date, location, etc.
 * Returns { imageUrl } and sets status META_PARSED in DB when image found.
 */
async function parseMetadata(page, eventUrl, supabase) {
  const result = { imageUrl: null };
  try {
    const panel = page.locator(".lux-overlay.panel .event-panel, .event-panel.flex-column, .cover-image-wrapper").first();
    await panel.waitFor({ state: "visible", timeout: 8000 }).catch(() => null);
    const imageUrl = await page
      .evaluate(() => {
        const wrap = document.querySelector(".cover-image-wrapper img");
        return wrap ? wrap.getAttribute("src") || wrap.src : null;
      })
      .catch(() => null);
    if (imageUrl) {
      result.imageUrl = imageUrl;
      if (supabase) {
        await updateEventMeta(supabase, eventUrl, {
          status: "META_PARSED",
          image_url: imageUrl,
          meta_parsed_at: new Date().toISOString(),
          last_attempt_at: new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    log("  parseMetadata error:", e.message);
  }
  return result;
}

/**
 * Get CTA button text from event popup. Returns trimmed inner text of primary CTA.
 */
async function getCtaButtonText(page) {
  try {
    const sel = ".cta-wrapper button.lux-button.primary, .cta-wrapper .lux-button.primary, .event-panel button.lux-button.primary";
    const btn = page.locator(sel).first();
    if (!(await btn.isVisible().catch(() => false))) return "";
    return (await btn.locator(".label").first().textContent().catch(() => btn.textContent()))?.trim() || "";
  } catch {
    return "";
  }
}

function shouldClickCta(ctaText) {
  const t = (ctaText || "").trim();
  if (CTA_SKIP_PHRASES.some((p) => t.includes(p))) return false;
  return CTA_CLICK_PHRASES.some((p) => t.includes(p));
}

/**
 * Click One-Click CTA, then open guests popup and parse guests (profile url, name, avatar, socials).
 */
async function clickCtaAndParseGuests(page, eventUrl, supabase) {
  const sel = ".cta-wrapper button.lux-button.primary, .event-panel button.lux-button.primary";
  const btn = page.locator(sel).first();
  if (!(await btn.isVisible().catch(() => false))) return [];
  await btn.click();
  await randomDelay(...DELAY_BETWEEN_CLICKS_MS);
  if (supabase) await updateEventJoined(supabase, eventUrl);

  const guestsBtn = page.locator('button.guests-button, button[class*="guests-button"]').first();
  if (!(await guestsBtn.isVisible().catch(() => false))) return [];
  await guestsBtn.click();
  await randomDelay(...DELAY_BETWEEN_CLICKS_MS);

  const guests = await page.evaluate((origin) => {
    const list = [];
    const userLinks = document.querySelectorAll('a[href^="/user/"]');
    const seen = new Set();
    for (const a of userLinks) {
      const href = a.getAttribute("href");
      if (!href || seen.has(href)) continue;
      seen.add(href);
      const profileUrl = href.startsWith("http") ? href : origin + (href.startsWith("/") ? href : "/" + href);
      const row = a.closest(".flex-center.gap-2") || a.closest("[class*='spread']") || a.parentElement?.parentElement;
      let name = "";
      const nameEl = a.querySelector(".name") || a.querySelector("[class*='name']") || a;
      if (nameEl) name = nameEl.textContent?.trim() || "";
      let avatar = "";
      const img = (row || a).querySelector("img.avatar, img[alt*='profile'], img[alt*='Фотография']");
      if (img) avatar = img.getAttribute("src") || img.src || "";
      const socials = {};
      const socialContainer = row?.querySelector(".social-links, [class*='social']") || row;
      if (socialContainer) {
        const links = socialContainer.querySelectorAll('a[target="_blank"]');
        for (const s of links) {
          const u = s.getAttribute("href");
          if (u && (u.includes("twitter.com") || u.includes("x.com"))) socials.twitter = u;
          else if (u && u.includes("linkedin.com")) socials.linkedin = u;
          else if (u) socials.website = u;
        }
      }
      list.push({ lumaProfileUrl: profileUrl, name, avatar, socials });
    }
    return list;
  }, "https://luma.com");

  if (supabase) {
    await updateEventGuestsParsed(supabase, eventUrl);
    await upsertGuests(supabase, eventUrl, guests);
  }
  return guests;
}

async function main() {
  const { calendar, maxEvents, headless, parseGuests } = getArgs();
  log("Start. calendar=", calendar, "maxEvents=", maxEvents, "headless=", headless, "parseGuests=", parseGuests);

  if (!fs.existsSync(AUTH_STATE_PATH)) {
    process.stderr.write(`No auth state at ${AUTH_STATE_PATH}. Run: npm run luma-scraper:login\n`);
    process.exit(1);
  }
  log("Auth state loaded from", AUTH_STATE_PATH);

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const supabase = await getSupabase();
  if (supabase) log("DB: writing events/users/attendees");
  else log("DB: skip (no SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");

  const browser = await chromium.launch({ headless, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    storageState: AUTH_STATE_PATH,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  const baseUrl = `https://lu.ma/${calendar}`;
  log("Opening calendar:", baseUrl);

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  const pageUrl = page.url();
  const origin = new URL(pageUrl).origin;
  log("Page loaded. url=", pageUrl);
  await randomDelay(2000, 4000);

  const scrollSteps = parseInt(process.env.LUMA_SCROLL_STEPS || "8", 10) || 8;
  log("Scrolling", scrollSteps, "steps...");
  for (let step = 0; step < scrollSteps; step++) {
    await page.evaluate(() => window.scrollBy(0, 400));
    await randomDelay(600, 1200);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await randomDelay(800, 1500);

  const rawHrefs = await page.evaluate(() => {
    const container = document.querySelector(".timeline") || document.querySelector(".schedule");
    if (!container) return [];
    const links = container.querySelectorAll(".card-wrapper a.event-link[href^='/']");
    return Array.from(links).map((a) => a.getAttribute("href")).filter(Boolean);
  });
  const nonEventSlugs = new Set(["home", "discover", "create", "map", "crypto", "login", "signup", "explore", calendar]);
  const seen = new Set();
  const eventHrefs = [];
  for (const href of rawHrefs) {
    const pathname = href.replace(/^\/+/, "").split("?")[0];
    const slug = pathname.split("/")[0]?.toLowerCase();
    if (!slug || nonEventSlugs.has(slug)) continue;
    const full = origin + "/" + (pathname.startsWith("/") ? pathname.slice(1) : pathname);
    if (seen.has(full)) continue;
    seen.add(full);
    eventHrefs.push({ href: href.startsWith("/") ? href : "/" + href, fullUrl: full });
  }
  log("Found event cards:", eventHrefs.length);
  const toProcess = eventHrefs.slice(0, maxEvents);
  const items = [];

  for (let i = 0; i < toProcess.length; i++) {
    const { href, fullUrl } = toProcess[i];
    log("Event", i + 1, "/", toProcess.length, ":", fullUrl);
    await saveEventDiscovered(supabase, fullUrl, calendar);

    try {
      const card = page.locator(`.card-wrapper a.event-link[href="${href}"]`).first();
      await card.scrollIntoViewIfNeeded().catch(() => null);
      await randomDelay(400, 800);
      await card.click();
      await randomDelay(...DELAY_BETWEEN_CLICKS_MS);

      const popup = page.locator(".lux-overlay.panel .event-panel, .event-panel.flex-column.gap-4").first();
      await popup.waitFor({ state: "visible", timeout: 10000 }).catch(() => null);

      const meta = await parseMetadata(page, fullUrl, supabase);
      const ctaText = await getCtaButtonText(page);
      log("  CTA text:", ctaText || "(none)");

      let guests = [];
      if (parseGuests && shouldClickCta(ctaText)) {
        guests = await clickCtaAndParseGuests(page, fullUrl, supabase);
        log("  guests:", guests.length);
      } else if (parseGuests) {
        log("  skip CTA (not one-click)");
      }

      items.push({
        url: fullUrl,
        imageUrl: meta.imageUrl,
        ctaText: ctaText || null,
        guestsCount: guests.length,
        guests: guests.slice(0, 50),
      });
    } catch (e) {
      log("  SKIP error:", e.message);
      if (supabase) {
        await supabase.from("luma_events").update({ status: "FAILED", last_attempt_at: new Date().toISOString() }).eq("url", fullUrl);
      }
    }

    try {
      await page.keyboard.press("Escape");
      await randomDelay(300, 600);
      await page.keyboard.press("Escape");
    } catch {}
    await randomDelay(...DELAY_BETWEEN_EVENTS_MS);
  }

  log("Done. Total items:", items.length);
  await browser.close();

  const filename = `luma-own-${Date.now()}.json`;
  const savedTo = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(savedTo, JSON.stringify({ scraper: "own", items, savedAt: new Date().toISOString() }, null, 2), "utf-8");
  process.stdout.write(JSON.stringify({ savedTo, count: items.length, items }) + "\n");
}

main().catch((err) => {
  log("FATAL:", err.message || err);
  process.exit(1);
});
