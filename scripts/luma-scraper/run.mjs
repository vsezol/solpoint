/**
 * Luma scraper (own): popup-based flow. Opens calendar, finds cards in .timeline .card-wrapper,
 * clicks each card to open event popup, parses full metadata (title, date/time, location, description,
 * organizers, cover image). Status META_PARSED only when all required fields parsed; otherwise
 * meta_parse_errors JSONB logs what failed. Optionally clicks One-Click CTA and parses guests.
 * Writes to DB when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set.
 *
 * Run: npm run luma-scraper:run
 * Or: node scripts/luma-scraper/run.mjs [calendarSlug] [maxEvents]
 * Env: LUMA_CALENDAR, LUMA_MAX_EVENTS, LUMA_TAG (optional ?tag=), LUMA_PARSE_GUESTS=1, LUMA_HEADLESS=1, LUMA_SCROLL_STEPS
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
// Already registered — don't click CTA, but still open guests list
const CTA_ALREADY_REGISTERED_PHRASES = ["My Ticket", "Мой билет"];

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
  const tag = (process.env.LUMA_TAG || process.argv[4] || "").trim();
  const headless = process.env.LUMA_HEADLESS === "1" || process.env.LUMA_HEADLESS === "true";
  const parseGuests = process.env.LUMA_PARSE_GUESTS === "1" || process.env.LUMA_PARSE_GUESTS === "true";
  return { calendar, maxEvents, tag, headless, parseGuests };
}

async function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;
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
  const { error } = await supabase.from("luma_events").upsert(
    {
      url,
      calendar_slug: calendarSlug,
      status: "DISCOVERED",
      last_attempt_at: new Date().toISOString(),
    },
    { onConflict: "url" }
  );
  if (error) {
    log("DB DISCOVERED error for", url, ":", error.message, error.details || "");
  } else {
    log("DB DISCOVERED ok for", url);
  }
}

async function updateEventMeta(supabase, url, payload) {
  if (!supabase) return;
  const { error } = await supabase.from("luma_events").update(payload).eq("url", url);
  if (error) {
    log("DB META error for", url, ":", error.message, error.details || "");
  } else {
    log("DB META ok for", url);
  }
}

/** Set META_PARSED only when meta_parse_errors is empty (all required fields parsed). */
function buildMetaPayload(meta, metaParseErrors) {
  const payload = {
    title: meta.title || null,
    description: meta.description || null,
    start_at: meta.start_at || null,
    end_at: meta.end_at || null,
    raw_date_time_display: meta.raw_date_time_display || null,
    location: meta.location || null,
    address: meta.address || null,
    location_lat: meta.location_lat ?? null,
    location_lng: meta.location_lng ?? null,
    location_place_id: meta.location_place_id || null,
    location_source: meta.location_source || null,
    image_url: meta.imageUrl || null,
    meta_parse_errors: metaParseErrors || {},
    last_attempt_at: new Date().toISOString(),
  };
  const allParsed = Object.keys(metaParseErrors || {}).length === 0;
  if (allParsed) {
    payload.status = "META_PARSED";
    payload.meta_parsed_at = new Date().toISOString();
  }
  return payload;
}

async function updateEventJoined(supabase, url) {
  if (!supabase) return;
  const { error } = await supabase.from("luma_events").update({ status: "JOINED", last_attempt_at: new Date().toISOString() }).eq("url", url);
  if (error) {
    log("DB JOINED error for", url, ":", error.message);
  } else {
    log("DB JOINED ok for", url);
  }
}

async function updateEventGuestsParsed(supabase, url) {
  if (!supabase) return;
  const { error } = await supabase
    .from("luma_events")
    .update({ status: "GUESTS_PARSED", guests_parsed_at: new Date().toISOString(), last_attempt_at: new Date().toISOString() })
    .eq("url", url);
  if (error) {
    log("DB GUESTS_PARSED error for", url, ":", error.message);
  } else {
    log("DB GUESTS_PARSED ok for", url);
  }
}

async function upsertGuests(supabase, eventUrl, guests) {
  if (!supabase || !guests.length) return;
  const { data: eventRow, error: eventErr } = await supabase.from("luma_events").select("id").eq("url", eventUrl).single();
  if (eventErr) {
    log("DB guests: event lookup error for", eventUrl, ":", eventErr.message);
    return;
  }
  if (!eventRow) {
    log("DB guests: event not found for", eventUrl);
    return;
  }
  const eventId = eventRow.id;
  log("DB guests: upserting", guests.length, "users for event", eventUrl);
  const origin = "https://luma.com";
  let ok = 0;
  let errCount = 0;
  for (const g of guests) {
    const profileUrl = g.lumaProfileUrl.startsWith("http") ? g.lumaProfileUrl : origin + (g.lumaProfileUrl.startsWith("/") ? g.lumaProfileUrl : "/" + g.lumaProfileUrl);
    const { error: uErr } = await supabase.from("luma_users").upsert(
      {
        luma_profile_url: profileUrl,
        name: g.name || null,
        avatar: g.avatar || null,
        social_links: g.socials || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "luma_profile_url" }
    );
    if (uErr) {
      errCount++;
      if (errCount <= 2) log("DB guests: user upsert error", profileUrl, uErr.message);
      continue;
    }
    const { data: userRow } = await supabase.from("luma_users").select("id").eq("luma_profile_url", profileUrl).single();
    if (userRow) {
      const { error: aErr } = await supabase.from("luma_event_attendees").upsert(
        { event_id: eventId, user_id: userRow.id, scraped_at: new Date().toISOString() },
        { onConflict: "event_id,user_id" }
      );
      if (aErr) {
        if (errCount <= 2) log("DB guests: attendee upsert error", aErr.message);
        errCount++;
      } else {
        ok++;
      }
    }
  }
  log("DB guests: done.", ok, "attendees linked.", errCount ? errCount + " errors" : "");
}

async function upsertOrganizers(supabase, eventUrl, organizers) {
  if (!supabase || !organizers.length) return;
  const { data: eventRow, error: eventErr } = await supabase.from("luma_events").select("id").eq("url", eventUrl).single();
  if (eventErr) {
    log("DB organizers: event lookup error for", eventUrl, ":", eventErr.message);
    return;
  }
  if (!eventRow) {
    log("DB organizers: event not found for", eventUrl);
    return;
  }
  const eventId = eventRow.id;
  log("DB organizers: upserting", organizers.length, "hosts for event", eventUrl);
  const origin = "https://luma.com";
  let ok = 0;
  for (const o of organizers) {
    const profileUrl = o.lumaProfileUrl.startsWith("http") ? o.lumaProfileUrl : origin + (o.lumaProfileUrl.startsWith("/") ? o.lumaProfileUrl : "/" + o.lumaProfileUrl);
    const { error: uErr } = await supabase.from("luma_users").upsert(
      {
        luma_profile_url: profileUrl,
        name: o.name || null,
        avatar: o.avatar || null,
        social_links: o.socials || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "luma_profile_url" }
    );
    if (uErr) {
      log("DB organizers: user upsert error", profileUrl, uErr.message);
      continue;
    }
    const { data: userRow } = await supabase.from("luma_users").select("id").eq("luma_profile_url", profileUrl).single();
    if (userRow) {
      const { error: oErr } = await supabase.from("luma_event_organizers").upsert(
        { event_id: eventId, user_id: userRow.id, scraped_at: new Date().toISOString() },
        { onConflict: "event_id,user_id" }
      );
      if (!oErr) ok++;
    }
  }
  log("DB organizers: done.", ok, "linked.");
}

/** Month name/abbreviation -> month number (1-12). RU (nom + gen) + EN so Luma dates parse in any locale. */
const MONTH_MAP = {
  января: 1,
  январь: 1,
  january: 1,
  янв: 1,
  jan: 1,
  февраля: 2,
  февраль: 2,
  february: 2,
  февр: 2,
  фев: 2,
  feb: 2,
  марта: 3,
  март: 3,
  march: 3,
  мар: 3,
  mar: 3,
  апреля: 4,
  апрель: 4,
  april: 4,
  апр: 4,
  apr: 4,
  май: 5,
  may: 5,
  июня: 6,
  июнь: 6,
  june: 6,
  июн: 6,
  jun: 6,
  июля: 7,
  июль: 7,
  july: 7,
  июл: 7,
  jul: 7,
  августа: 8,
  август: 8,
  august: 8,
  авг: 8,
  aug: 8,
  сентября: 9,
  сентябрь: 9,
  september: 9,
  сен: 9,
  сент: 9,
  sep: 9,
  sept: 9,
  октября: 10,
  октябрь: 10,
  october: 10,
  окт: 10,
  oct: 10,
  ноября: 11,
  ноябрь: 11,
  november: 11,
  нояб: 11,
  ноя: 11,
  nov: 11,
  декабря: 12,
  декабрь: 12,
  december: 12,
  дек: 12,
  dec: 12,
};

/** Try to parse Luma date + time strings into ISO timestamptz. Uses MONTH_MAP for RU/EN. Returns { start_at, end_at } or nulls. */
function parseLumaDateTime(dateText, timeDesc) {
  let start_at = null;
  let end_at = null;
  if (!dateText || !timeDesc) return { start_at, end_at };
  const rangeMatch = timeDesc.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  const startHour = rangeMatch ? parseInt(rangeMatch[1], 10) : null;
  const startMin = rangeMatch ? parseInt(rangeMatch[2], 10) : null;
  const endHour = rangeMatch ? parseInt(rangeMatch[3], 10) : null;
  const endMin = rangeMatch ? parseInt(rangeMatch[4], 10) : null;
  if (startHour == null || startMin == null) return { start_at, end_at };

  const tzMatch = timeDesc.match(/GMT\s*([+-])\s*(\d+)/i) || timeDesc.match(/([+-])(\d+)\s*$/);
  const tzSign = tzMatch ? (tzMatch[1] === "+" ? 1 : -1) : 0;
  const tzHours = tzMatch ? tzSign * parseInt(tzMatch[2], 10) : 0;

  const dayMatch = dateText.match(/\b(\d{1,2})\b/);
  const day = dayMatch ? parseInt(dayMatch[1], 10) : null;
  if (day == null || day < 1 || day > 31) return { start_at, end_at };

  const lower = dateText.toLowerCase().replace(/\s+/g, " ");
  let month = null;
  const sortedKeys = Object.keys(MONTH_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      month = MONTH_MAP[key];
      break;
    }
  }
  if (month == null) return { start_at, end_at };

  const year = new Date().getFullYear();
  const monthIndex = month - 1;
  try {
    const utcStartHour = startHour - tzHours;
    const utcStartMin = startMin;
    const d = new Date(Date.UTC(year, monthIndex, day, utcStartHour, utcStartMin, 0, 0));
    if (!Number.isNaN(d.getTime())) start_at = d.toISOString();
    if (endHour != null && endMin != null) {
      const utcEndHour = endHour - tzHours;
      const utcEndMin = endMin;
      const dEnd = new Date(Date.UTC(year, monthIndex, day, utcEndHour, utcEndMin, 0, 0));
      if (!Number.isNaN(dEnd.getTime())) end_at = dEnd.toISOString();
    }
  } catch {
    // ignore
  }
  return { start_at, end_at };
}

/** Extract lat, lng, place_id from iframe src or gmaps link. Returns { lat, lng, place_id, source }. */
function parseLocationFromIframeOrLink(iframeSrc, gmapsHref) {
  const result = { lat: null, lng: null, place_id: null, source: null };
  if (iframeSrc) {
    const centerMatch = iframeSrc.match(/center=([^&]+)/);
    const placeMatch = iframeSrc.match(/place_id%3D([^&]+)/) || iframeSrc.match(/place_id=([^&]+)/);
    if (centerMatch) {
      const parts = decodeURIComponent(centerMatch[1]).split(",").map(Number);
      if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        result.lat = parts[0];
        result.lng = parts[1];
        result.source = "embedded_map";
      }
    }
    if (placeMatch) result.place_id = decodeURIComponent(placeMatch[1]);
  }
  if ((result.lat == null || result.lng == null) && gmapsHref) {
    const queryMatch = gmapsHref.match(/query=([^&]+)/);
    const placeMatch = gmapsHref.match(/query_place_id=([^&]+)/);
    if (placeMatch) result.place_id = decodeURIComponent(placeMatch[1]);
    if (queryMatch) {
      const decoded = decodeURIComponent(queryMatch[1]);
      const coords = decoded.split(",").map((s) => Number(s.trim()));
      if (coords.length >= 2 && !Number.isNaN(coords[0]) && !Number.isNaN(coords[1])) {
        result.lat = coords[0];
        result.lng = coords[1];
        if (!result.source) result.source = "gmaps_link";
      }
    }
  }
  return result;
}

const ABOUT_LABELS = ["О событии", "About Event", "About"];
const VENUE_LABELS = ["Место проведения", "Venue", "Location", "Place"];
const HOST_LABELS = ["Организатор", "Host", "Organizer"];

/**
 * Parse full metadata from event popup: title, image, date/time, location, description, organizers.
 * Returns { meta, meta_parse_errors, organizers }. META_PARSED is set only when meta_parse_errors is empty.
 */
async function parseMetadata(page, eventUrl, supabase) {
  const metaParseErrors = {};
  const result = {
    title: null,
    imageUrl: null,
    start_at: null,
    end_at: null,
    raw_date_time_display: null,
    description: null,
    location: null,
    address: null,
    location_lat: null,
    location_lng: null,
    location_place_id: null,
    location_source: null,
    organizers: [],
  };

  try {
    const panel = page.locator(".lux-overlay.panel .event-panel, .event-panel.flex-column, .cover-image-wrapper").first();
    await panel.waitFor({ state: "visible", timeout: 8000 }).catch(() => null);

    const raw = await page
      .evaluate(
        ({ aboutLabels, venueLabels, hostLabels }) => {
          const getText = (el) => (el ? (el.textContent || "").trim() : "");
          const data = {
            title: null,
            imageUrl: null,
            dateText: null,
            timeDesc: null,
            locationName: null,
            locationAddress: null,
            iframeSrc: null,
            gmapsHref: null,
            descriptionParagraphs: [],
            organizers: [],
          };

          const titleEl = document.querySelector(".top-wrapper .title, .top-card-content h1.title, h1.title.text-primary");
          if (titleEl) data.title = getText(titleEl);

          const imgEl = document.querySelector(".cover-image-wrapper img");
          if (imgEl) data.imageUrl = imgEl.getAttribute("src") || imgEl.src || null;

          const iconRows = document.querySelectorAll(".icon-row");
          for (const row of iconRows) {
            const calendarCard = row.querySelector(".calendar-card");
            if (calendarCard) {
              const titleEl = row.querySelector(".title");
              const descEl = row.querySelector(".desc");
              if (titleEl) data.dateText = getText(titleEl);
              if (descEl) data.timeDesc = getText(descEl);
              break;
            }
          }

          const locationRow = document.querySelector(".location-row");
          if (locationRow) {
            const titleEl = locationRow.querySelector(".title");
            const descEl = locationRow.querySelector(".desc");
            if (titleEl) data.locationName = getText(titleEl.querySelector(".text-ellipses") || titleEl);
            if (descEl) data.locationAddress = getText(descEl);
          }

          const contentCards = document.querySelectorAll(".content-card");
          for (const card of contentCards) {
            const labelEl = card.querySelector(".card-title .title-label");
            const label = labelEl ? getText(labelEl) : "";
            if (venueLabels.some((l) => label.includes(l))) {
              const content = card.querySelector(".content");
              if (content) {
                const fw = content.querySelector(".fw-medium");
                const tinted = content.querySelector(".text-tinted.fs-sm, .fs-sm.text-tinted");
                if (fw && !data.locationName) data.locationName = getText(fw);
                if (tinted) data.locationAddress = getText(tinted);
                const iframe = content.querySelector(".gmaps iframe[src], iframe[src*='google.com/maps']");
                if (iframe) data.iframeSrc = iframe.getAttribute("src") || null;
                const gmapsLink = content.querySelector(".gmaps a[href*='google.com/maps']");
                if (gmapsLink) data.gmapsHref = gmapsLink.getAttribute("href") || null;
              }
            }
            if (aboutLabels.some((l) => label.includes(l))) {
              const spark = card.querySelector(".spark-content");
              const container = spark || card.querySelector(".content");
              if (container) {
                const paras = container.querySelectorAll("p");
                data.descriptionParagraphs = Array.from(paras).map((p) => getText(p)).filter(Boolean);
              }
            }
            if (hostLabels.some((l) => label.includes(l))) {
              const hosts = card.querySelectorAll(".hosts a[href^='/user/'], a[href^='/user/']");
              const seen = new Set();
              for (const a of hosts) {
                const href = a.getAttribute("href");
                if (!href || seen.has(href)) continue;
                seen.add(href);
                const row = a.closest(".host-row") || a.closest(".flex-center") || a.parentElement;
                let name = "";
                const nameEl = a.querySelector(".fw-medium") || a.querySelector("[class*='name']") || a;
                if (nameEl) name = getText(nameEl);
                let avatar = "";
                const img = (row || a).querySelector(".avatar, img.avatar");
                if (img) {
                  const bg = img.style?.backgroundImage || (typeof getComputedStyle !== "undefined" ? getComputedStyle(img).backgroundImage : "");
                  if (bg) avatar = bg.replace(/url\(["']?([^"')]+)["']?\)/, "$1").trim();
                  else if (img.src) avatar = img.src;
                }
                const socials = {};
                const socialContainer = row?.querySelector(".social-links") || row;
                if (socialContainer) {
                  const links = socialContainer.querySelectorAll('a[target="_blank"]');
                  for (const s of links) {
                    const u = s.getAttribute("href");
                    if (u && (u.includes("twitter.com") || u.includes("x.com"))) socials.twitter = u;
                    else if (u && u.includes("linkedin.com")) socials.linkedin = u;
                    else if (u) socials.website = u;
                  }
                }
                data.organizers.push({ href, name, avatar, socials });
              }
            }
          }

          return data;
        },
        { aboutLabels: ABOUT_LABELS, venueLabels: VENUE_LABELS, hostLabels: HOST_LABELS }
      )
      .catch((err) => {
        log("  parseMetadata evaluate error:", err?.message ?? String(err));
        if (err?.stack) process.stderr.write(`[luma-scraper] ${err.stack}\n`);
        return null;
      });

    if (!raw) {
      metaParseErrors._parse = "evaluate_failed";
      if (supabase) {
        await updateEventMeta(supabase, eventUrl, buildMetaPayload(result, metaParseErrors));
      }
      return { ...result, metaParseErrors, organizers: [] };
    }

    result.title = raw.title || null;
    result.imageUrl = raw.imageUrl || null;
    if (!result.title) metaParseErrors.title = "not_found";
    if (!result.imageUrl) metaParseErrors.image_url = "not_found";

    const { start_at, end_at } = parseLumaDateTime(raw.dateText, raw.timeDesc);
    result.start_at = start_at;
    result.end_at = end_at;
    if (!result.start_at && (raw.dateText || raw.timeDesc)) metaParseErrors.start_at = "parse_failed";

    result.raw_date_time_display = [raw.dateText, raw.timeDesc].filter(Boolean).join(", ") || null;

    result.location = raw.locationName || null;
    result.address = raw.locationAddress || null;
    if (!result.location) metaParseErrors.location = "not_found";
    if (!result.address) metaParseErrors.address = "not_found";

    const coords = parseLocationFromIframeOrLink(raw.iframeSrc, raw.gmapsHref);
    result.location_lat = coords.lat;
    result.location_lng = coords.lng;
    result.location_place_id = coords.place_id || null;
    result.location_source = coords.source || null;

    result.description = raw.descriptionParagraphs && raw.descriptionParagraphs.length ? raw.descriptionParagraphs.join("\n\n") : null;
    if (!result.description && raw.descriptionParagraphs && raw.descriptionParagraphs.length === 0) metaParseErrors.description = "not_found";

    const origin = "https://luma.com";
    result.organizers = (raw.organizers || []).map((o) => ({
      lumaProfileUrl: o.href.startsWith("http") ? o.href : origin + (o.href.startsWith("/") ? o.href : "/" + o.href),
      name: o.name || "",
      avatar: o.avatar || "",
      socials: o.socials || {},
    }));

    if (supabase) {
      const payload = buildMetaPayload(result, metaParseErrors);
      await updateEventMeta(supabase, eventUrl, payload);
      if (result.organizers.length) await upsertOrganizers(supabase, eventUrl, result.organizers);
    }
  } catch (e) {
    metaParseErrors._exception = e.message || String(e);
    log("  parseMetadata error:", e.message);
    if (supabase) {
      await updateEventMeta(supabase, eventUrl, buildMetaPayload(result, metaParseErrors));
    }
  }

  return { ...result, metaParseErrors, organizers: result.organizers };
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

function shouldParseGuestsWithoutClick(ctaText) {
  const t = (ctaText || "").trim();
  return CTA_ALREADY_REGISTERED_PHRASES.some((p) => t.includes(p));
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

/** Already registered (My Ticket / Мой билет): open guests list without clicking CTA. */
async function openGuestsOnlyAndParse(page, eventUrl, supabase) {
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
  const { calendar, maxEvents, tag, headless, parseGuests } = getArgs();
  log("Start. calendar=", calendar, "maxEvents=", maxEvents, "tag=", tag || "(none)", "headless=", headless, "parseGuests=", parseGuests);

  if (!fs.existsSync(AUTH_STATE_PATH)) {
    process.stderr.write(`No auth state at ${AUTH_STATE_PATH}. Run: npm run luma-scraper:login\n`);
    process.exit(1);
  }
  log("Auth state loaded from", AUTH_STATE_PATH);

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  log("ENV check: NEXT_PUBLIC_SUPABASE_URL=", process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "empty");
  log("ENV check: SUPABASE_URL=", process.env.SUPABASE_URL ? "set" : "empty");
  log("ENV check: SUPABASE_SERVICE_ROLE_KEY=", process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "empty");
  log("ENV check: SUPABASE_API_KEY=", process.env.SUPABASE_API_KEY ? "set" : "empty");
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
  let baseUrl = `https://lu.ma/${calendar}`;
  if (tag) {
    baseUrl += `?tag=${encodeURIComponent(tag)}`;
  }
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
      if (Object.keys(meta.metaParseErrors || {}).length > 0) {
        log("  meta_parse_errors:", meta.metaParseErrors);
      }
      const ctaText = await getCtaButtonText(page);
      log("  CTA text:", ctaText || "(none)");

      let guests = [];
      if (parseGuests && shouldClickCta(ctaText)) {
        guests = await clickCtaAndParseGuests(page, fullUrl, supabase);
        log("  guests:", guests.length);
      } else if (parseGuests && shouldParseGuestsWithoutClick(ctaText)) {
        guests = await openGuestsOnlyAndParse(page, fullUrl, supabase);
        log("  guests (already registered):", guests.length);
      } else if (parseGuests) {
        log("  skip CTA (not one-click)");
      }

      items.push({
        url: fullUrl,
        title: meta.title,
        imageUrl: meta.imageUrl,
        start_at: meta.start_at,
        end_at: meta.end_at,
        raw_date_time_display: meta.raw_date_time_display,
        description: meta.description ? meta.description.slice(0, 200) + (meta.description.length > 200 ? "…" : "") : null,
        location: meta.location,
        address: meta.address,
        location_lat: meta.location_lat,
        location_lng: meta.location_lng,
        location_place_id: meta.location_place_id,
        organizersCount: (meta.organizers || []).length,
        meta_parse_errors: meta.metaParseErrors || {},
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
