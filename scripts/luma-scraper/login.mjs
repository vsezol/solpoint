/**
 * One-time login for Luma: opens a real browser, you log in manually,
 * then we save cookies/storage to data/luma-scraper/auth-state.json.
 * Run: npm run luma-scraper:login
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const AUTH_DIR = path.join(process.cwd(), "data", "luma-scraper");
const AUTH_STATE_PATH = path.join(AUTH_DIR, "auth-state.json");

async function main() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    channel: undefined,
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  await page.goto("https://lu.ma/", { waitUntil: "domcontentloaded" });

  console.log("Browser opened. Log in to Luma in the window (Google or email).");
  console.log("When you're logged in and see the Luma home/calendar, press Enter here to save session...");

  await new Promise((resolve) => {
    process.stdin.once("data", resolve);
  });

  await context.storageState({ path: AUTH_STATE_PATH });
  console.log("Saved session to:", AUTH_STATE_PATH);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
