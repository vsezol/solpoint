# Own Luma scraper (Playwright)

## First-time login (once)

```bash
npm run luma-scraper:login
```

A browser window opens. Log in to [lu.ma](https://lu.ma) (Google or email). When done, switch to the terminal and press Enter. Session is saved to `data/luma-scraper/auth-state.json` (gitignored).

## Run scraper

From admin UI: choose **Own (Playwright)**, set calendar slug (e.g. `superteam`) and max events, then Run.

From CLI (e.g. for cron):

```bash
npm run luma-scraper:run
# or with args:
node scripts/luma-scraper/run.mjs superteam 30
# or env:
LUMA_CALENDAR=superteam LUMA_MAX_EVENTS=30 node scripts/luma-scraper/run.mjs
```

**Visible browser by default** — you always see what the bot clicks. To run without a window (e.g. on a server):

```bash
LUMA_HEADLESS=1 node scripts/luma-scraper/run.mjs superteam 5
```

**Fetch guest list per event** (click "Register in one click" then "guests" and collect `/user/` links; slower):

```bash
LUMA_FETCH_GUESTS=1 node scripts/luma-scraper/run.mjs superteam 5
```

Event links on lu.ma are `lu.ma/<event-slug>` (e.g. `lu.ma/roast-my-design`), not `/evt-xxx`. All progress is logged to stderr (`[luma-scraper] ...`).

Results are written to `data/luma-scraper-results/luma-own-<timestamp>.json`.

## Install browsers (first time)

After `npm install`, install Chromium for Playwright:

```bash
npx playwright install chromium
```
