# Luma scraper — technical requirements (phases)

Scraper is split into phases so we can run them separately, re-run only what’s needed (e.g. refresh guests), and resume after failures.

---

## Phase 0 — Collect event links

**Input:** Calendar page URL (e.g. `https://lu.ma/superteam` or `https://luma.com/superteam`).

**Actions:**
1. Open calendar page (authenticated session).
2. Scroll to load the full event list (events are below the fold / lazy-loaded).
3. Find the events container (`.schedule` or `.timeline`).
4. Collect all event links: `a.event-link` or `.card-wrapper a[href^='/']` inside that container.
5. Normalise to full URLs; exclude non-event slugs (home, discover, create, map, crypto, login, signup, explore, calendar slug).

**Output:** List of event URLs (and optionally minimal fields, e.g. `{ url, slug }`).  
**Persistence:** Save to file (e.g. `data/luma-scraper-results/events-phase0-<timestamp>.json`) or later to DB. No event metadata yet.

**Notes:** Already implemented in `run.mjs` (scroll + container-scoped links + blocklist). Phase 0 can be extracted as a dedicated script or mode that only outputs links.

---

## Phase 1 — Event metadata

**Input:** List of event URLs from Phase 0 (file or DB).

**Actions:** For each event URL:
1. Open event page (`page.goto(url)`).
2. **Participant count:** Read from UI. For some events the count is visible without action; for others the list is gated (approval required) or requires clicking “Register” / “Register in one click” to see attendees — handle both cases (we may get “N guests” without opening the list).
3. **Registration gating:** If “Register” (or localised equivalent) is present, optionally click it so that guest-related UI becomes visible for Phase 2; document which events required registration click.
4. Scrape metadata:
   - Title
   - Description
   - Date/time (start, end if available)
   - Location (venue, city, country)
   - Organiser
   - Image URL (if needed)
   - Any other useful fields (e.g. timezone, capacity).

**Output:** Per-event records with metadata.  
**Persistence:** Save to file (e.g. `events-phase1-<timestamp>.json`) or to DB keyed by event ID/URL. Event record should have a stable ID (e.g. slug or URL) for Phase 2 to attach guests.

**Edge cases:**
- Events that require approval to view details: we may get partial metadata or only title/date; document “metadata_partial” or “gated” flag.
- Failed loads (timeout, 404): skip and log; optionally retry later.

---

## Phase 2 — Guest list (attendees) per event

**Input:** List of events that have metadata from Phase 1 (same source: file or DB), identified by event ID/URL.

**Actions:** For each event:
1. Open event page (or reuse session if we run Phase 1 and 2 back-to-back).
2. If guest list is not visible: click “Register in one click” / “Register” (and similar localised strings) so the guest section appears.
3. Open the guest list: click the control that shows “X guests” or “Name … and N more” (e.g. `.guests-button` or `[class*="guests"]`).
4. Collect all profile links: `a[href^="/user/"]` in the opened modal/panel.
5. Normalise to full URLs (e.g. `https://luma.com/user/xxx` or `https://lu.ma/user/xxx`).

**Output:** Per event: list of user profile URLs (and optionally display names if easily available).  
**Persistence:** Attach this list to the event record (event ID → array of user URLs). Store in same file/DB as Phase 1 so that event ID has a `guestUserLinks` (or similar) field.

**Notes:** Some events will not allow opening the guest list (approval-only); then we store an empty list or a flag “guests_gated”. Phase 2 can be run periodically to refresh guest lists without re-running Phase 0 or Phase 1.

---

## Phase 3 — User profiles (social links) — future / manual

**Input:** List of user profile URLs (e.g. from Phase 2 guest lists).

**Actions:** For each user URL:
1. Open user profile page.
2. Scrape: display name, bio, and **social links** (Twitter/X, LinkedIn, website, etc.) if present in the profile.

**Output:** Per user: profile URL, name, social links.  
**Persistence:** User table or JSON keyed by profile URL; link users to events via guest lists.

**Scope:** Not in the first implementation. Can be a separate script or manual step later; may be rate-limited, so run sparingly or on demand.

---

## Data model (target)

- **Events:** `id` (slug or URL), `url`, `title`, `description`, `date`, `location`, `organiser`, `participantCount`, `guestUserLinks` (array of user URLs), optional flags (`metadata_partial`, `guests_gated`).
- **Users (Phase 3):** `profileUrl`, `name`, `socialLinks` (optional); relation to events via guest lists.

For now, persistence can be file-based (JSON per phase or one combined file); DB schema can follow the same structure when we add it.

---

## Implementation order

1. **Phase 0** — already done in `run.mjs`; optionally extract to a “phase0-only” output (only links, no metadata).
2. **Phase 1** — new script or mode: read Phase 0 output, visit each URL, scrape metadata, write Phase 1 output.
3. **Phase 2** — new script or mode: read Phase 1 output (or DB), visit each event, open guest list, collect user URLs, attach to event and save.
4. **Phase 3** — later; separate script or manual.

---

## Run modes (suggested)

- `phase0` — only collect event links → `events-phase0-<ts>.json`.
- `phase1` — input: phase0 file (or list); output: events with metadata → `events-phase1-<ts>.json`.
- `phase2` — input: phase1 file (or DB); output: same events with `guestUserLinks` filled.
- `phase3` — (future) input: list of user URLs; output: user profiles with socials.

Single combined run (phase0 → phase1 → phase2 in one process) can be added later for convenience; phased runs allow re-running only Phase 2 to refresh guests.
