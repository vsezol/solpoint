/**
 * Luma scraper (own): loads saved session, scrapes lu.ma calendar events.
 * Run: npm run luma-scraper:run
 * Or with args: node scripts/luma-scraper/run.mjs [calendarSlug] [maxEvents]
 * Or env: LUMA_CALENDAR=superteam LUMA_MAX_EVENTS=30 node scripts/luma-scraper/run.mjs
 * Browser is visible by default. To run headless: LUMA_HEADLESS=1 node scripts/luma-scraper/run.mjs
 *
 * Writes result to data/luma-scraper-results/luma-own-{timestamp}.json
 * Prints one JSON line to stdout: {"savedTo":"...","count":N,"items":[...]} (items optional for API)
 * All progress logs go to stderr so API can still parse stdout.
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const AUTH_DIR = path.join(process.cwd(), "data", "luma-scraper");
const AUTH_STATE_PATH = path.join(AUTH_DIR, "auth-state.json");
const RESULTS_DIR = path.join(process.cwd(), "data", "luma-scraper-results");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min, max) => delay(min + Math.random() * (max - min));

// Log to stderr so stdout stays a single JSON line for API
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
  return { calendar, maxEvents, headless };
}

async function main() {
  const { calendar, maxEvents, headless } = getArgs();
  log("Start. calendar=", calendar, "maxEvents=", maxEvents, "headless=", headless);

  if (!fs.existsSync(AUTH_STATE_PATH)) {
    const msg = `No auth state found at ${AUTH_STATE_PATH}. Run: npm run luma-scraper:login`;
    process.stderr.write(msg + "\n");
    process.exit(1);
  }
  log("Auth state loaded from", AUTH_STATE_PATH);

  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless,
    args: ["--no-sandbox"],
  });
  log("Browser launched, headless=", headless);

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
  const pageTitle = await page.title();
  const pageUrl = page.url();
  log("Page loaded. title=", pageTitle, "url=", pageUrl);
  await randomDelay(2000, 4000);

  // Scroll down to load event list (events are below the fold / lazy-loaded)
  const scrollSteps = parseInt(process.env.LUMA_SCROLL_STEPS || "8", 10) || 8;
  log("Scrolling page", scrollSteps, "steps to load events...");
  for (let step = 0; step < scrollSteps; step++) {
    await page.evaluate((stepIndex) => {
      const scrollAmount = 400;
      window.scrollBy(0, scrollAmount);
    }, step);
    await randomDelay(600, 1200);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await randomDelay(800, 1500);

  // Event links: only from events list container (.schedule or .timeline) to avoid nav links (home, discover, create)
  const origin = new URL(pageUrl).origin;
  const rawHrefs = await page.evaluate(() => {
    const container = document.querySelector(".schedule") || document.querySelector(".timeline");
    const links = container
      ? container.querySelectorAll("a.event-link, .card-wrapper a[href^='/']")
      : document.querySelectorAll("a.event-link");
    return Array.from(links).map((a) => a.getAttribute("href")).filter(Boolean);
  });
  const allowedHosts = ["lu.ma", "www.lu.ma", "luma.com", "www.luma.com"];
  const nonEventSlugs = new Set([
    "home",
    "discover",
    "create",
    "map",
    "crypto",
    "login",
    "signup",
    "explore",
    calendar,
  ]);
  const seen = new Set();
  const eventLinks = [];
  for (const href of rawHrefs) {
    let url;
    try {
      url = href.startsWith("http") ? new URL(href) : new URL(href, origin);
    } catch {
      continue;
    }
    if (!allowedHosts.includes(url.hostname)) continue;
    const pathSegments = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
    if (pathSegments.length !== 1) continue;
    const slug = pathSegments[0].toLowerCase();
    if (nonEventSlugs.has(slug)) continue;
    const full = url.origin + url.pathname;
    if (seen.has(full)) continue;
    seen.add(full);
    eventLinks.push(full);
  }

  log("Found event links (lu.ma/<slug>):", eventLinks.length);
  if (eventLinks.length > 0) {
    eventLinks.slice(0, 5).forEach((u, i) => log("  link " + (i + 1) + ":", u));
    if (eventLinks.length > 5) log("  ... and", eventLinks.length - 5, "more");
  }

  const toFetch = eventLinks.slice(0, maxEvents);
  const items = [];

  const fetchGuests = process.env.LUMA_FETCH_GUESTS === "1" || process.env.LUMA_FETCH_GUESTS === "true";

  for (let i = 0; i < toFetch.length; i++) {
    const url = toFetch[i];
    log("Event", i + 1, "/", toFetch.length, ":", url);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await randomDelay(3000, 6000);

      const event = await page.evaluate(() => {
        const titleEl = document.querySelector("h1") || document.querySelector("[data-testid='event-title']");
        const title = titleEl ? titleEl.textContent?.trim() || "" : "";

        const dateEl =
          document.querySelector("time") ||
          document.querySelector("[datetime]") ||
          document.querySelector("[data-testid='event-date']");
        const date = dateEl?.getAttribute("datetime") || dateEl?.textContent?.trim() || "";

        const descEl =
          document.querySelector("[data-testid='event-description']") ||
          document.querySelector(".event-description") ||
          document.querySelector('meta[name="description"]');
        const description = descEl
          ? descEl.getAttribute?.("content") || descEl.textContent?.trim() || ""
          : "";

        const orgEl =
          document.querySelector("[data-testid='organizer-name']") ||
          document.querySelector('a[href*="/org-"]');
        const organizer = orgEl ? orgEl.textContent?.trim() || "" : "";

        const link = window.location.href;
        return { title, date, description, organizer, url: link };
      });

      event.url = url;
      event.guestUserLinks = [];

      if (fetchGuests) {
        try {
          // 1) Click "Register in one click" (CTA) so guest list becomes visible
          const registerBtn = await page.locator('button:has-text("Register"), button:has-text("Регистрация"), .lux-button.primary').first();
          if (await registerBtn.isVisible().catch(() => false)) {
            await registerBtn.click();
            await randomDelay(2000, 4000);
          }
          // 2) Click button that opens guest list (guests-button / "X гостей" or "Purity ... и ещё 21")
          const guestsBtn = await page.locator('button.guests-button, [class*="guests"]').first();
          if (await guestsBtn.isVisible().catch(() => false)) {
            await guestsBtn.click();
            await randomDelay(2000, 3500);
          }
          // 3) Collect user profile links from the modal (a[href^="/user/"])
          const guestHrefs = await page.$$eval('a[href^="/user/"]', (links) =>
            links.map((a) => a.getAttribute("href")).filter(Boolean)
          );
          const unique = [...new Set(guestHrefs.map((h) => (h.startsWith("http") ? h : "https://lu.ma" + (h.startsWith("/") ? h : "/" + h))))];
          event.guestUserLinks = unique;
          log("  guests found:", unique.length);
        } catch (guestErr) {
          log("  guests skip:", guestErr.message);
        }
      }

      items.push(event);
      log("  parsed title=", event.title || "(empty)", "date=", event.date || "(empty)");
    } catch (e) {
      log("  SKIP error:", e.message);
    }

    if (i < toFetch.length - 1) {
      await randomDelay(3000, 5000);
    }
  }

  log("Done. Total items:", items.length);

  await browser.close();

  const filename = `luma-own-${Date.now()}.json`;
  const savedTo = path.join(RESULTS_DIR, filename);
  const payload = { scraper: "own", items, savedAt: new Date().toISOString() };
  fs.writeFileSync(savedTo, JSON.stringify(payload, null, 2), "utf-8");

  const out = { savedTo, count: items.length, items };
  process.stdout.write(JSON.stringify(out) + "\n");
}

main().catch((err) => {
  log("FATAL:", err.message || err);
  process.exit(1);
});
