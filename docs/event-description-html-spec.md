# Event description: HTML storage and rendering (technical specification)

## Current state (temporary solution)

- **Storage:** `events.description` and `luma_events.description` store a **plain text** string. The Luma scraper builds it by joining paragraph texts with `\n\n` (see `scripts/luma-scraper/run.mjs`: `raw.descriptionParagraphs.join("\n\n")`). Lists (`<ul>`, `<li>`), `<hr>`, and inline formatting (`<strong>`, etc.) are **not** preserved.
- **Rendering (temporary):** The frontend renders `event.description` inside a `<p>` with the Tailwind class **`whitespace-pre-line`**, so existing newline characters (`\n`, `\n\n`) in the string are displayed as line breaks. This is a **temporary** solution until HTML-based descriptions are implemented.
- **Places that render description:**
  - `src/app/events/[slug]/page.tsx` — full event page
  - `src/components/cards/event-card.tsx` — event card (with `line-clamp-2`)
  - `src/app/dashboard/page.tsx` — dashboard event list (with `line-clamp-2`)

**When implementing the HTML flow below, remove the temporary `whitespace-pre-line`-only rendering and replace it with HTML-aware rendering (see "Frontend" section).**

---

## Target state: store and render HTML description

### Goals

1. Preserve full structure of Luma event "About" block: paragraphs, lists (`<ul>`, `<ol>`, `<li>`), headings, horizontal rules (`<hr>`), and inline formatting (`<strong>`, `<em>`, `<a>`).
2. Single source of truth: one HTML fragment in the DB, no custom serialization format.
3. Safe rendering: no XSS; only allowed tags and attributes.

### 1. Scraper (Luma)

**Location:** `scripts/luma-scraper/run.mjs` (and any admin scraper that writes to `luma_events`).

**Current behavior:** In the "About event" / "О событии" content card, the code selects `container.querySelectorAll("p")`, extracts `textContent` per paragraph, and joins with `"\n\n"`.

**New behavior:**

- Identify the same block (e.g. content card whose label matches "About event" / "About" / "О событии").
- Take the **inner HTML** of the description container (e.g. `div.spark-content` or the `div.content` subtree that holds the about text). Use something like `container.innerHTML` (or serialize only the inner wrapper that has the `<p>`, `<ul>`, `<hr>` etc.).
- **Do not** store raw Luma markup as-is if it contains:
  - Script tags, event handlers, or `javascript:` URLs.
  - Excessive or non-essential Luma-specific classes (optional: strip class/id attributes or keep only for styling if needed).
- Write this HTML string into `luma_events.description` (and later into `events.description` via transfer/sync). So the column remains `TEXT` but will contain HTML fragments instead of plain text with `\n\n`.

**Backward compatibility:** Existing rows may still have plain-text descriptions (with `\n\n`). The transfer/sync and frontend must support both formats during and after migration (see below).

### 2. Sanitization (security)

- **Requirement:** All HTML that is stored and/or rendered must be sanitized to prevent XSS.
- **Allowed elements (whitelist):** e.g. `p`, `br`, `strong`, `em`, `b`, `i`, `ul`, `ol`, `li`, `hr`, `a`, and optionally `h2`, `h3` if present in Luma markup. No `script`, `iframe`, `object`, `form`, `input`, `style`, `svg` with handlers, etc.
- **Allowed attributes:** For `a`: only `href` with safe values (e.g. `https:` and `http:`; block `javascript:`, `data:` with scripts, etc.). Strip other attributes (e.g. `class`, `id`) unless we explicitly want to keep a limited set for styling.
- **Where to sanitize:**
  - **Option A:** In the scraper (Node): use a library such as `dompurify` (with a JSDOM or similar DOM) or a dedicated sanitizer (e.g. `sanitize-html`) before writing to the DB.
  - **Option B:** On the backend when saving (e.g. in transfer route or when updating `events.description`): sanitize before insert/update.
  - **Option C:** On the frontend before rendering: sanitize when passing the string to `dangerouslySetInnerHTML`.
  - **Recommendation:** Sanitize at least at **write time** (scraper or API) so the DB never contains dangerous HTML. Optionally **also** sanitize on read/render for defense in depth.
- **Library:** Use a well-maintained sanitizer (e.g. `DOMPurify` or `sanitize-html` in Node; `DOMPurify` in the browser if we sanitize on the client).

### 3. Transfer / sync (Luma → events)

**Locations:** e.g. `src/app/api/admin/luma/transfer/route.ts`, `scripts/luma-sync-to-events.mjs`.

- Continue to map `luma_events.description` → `events.description` as a string.
- If sanitization is done in the scraper or in the transfer API, the stored value is already safe HTML; no change to the mapping logic except to treat the field as HTML-capable.
- If existing `luma_events` rows are backfilled with HTML (e.g. by re-scraping), ensure transfer does not strip or re-escape HTML.

### 4. Frontend rendering

- **Detection:** If `event.description` looks like HTML (e.g. starts with `<` and contains `>`), treat it as HTML; otherwise treat as legacy plain text.
- **Legacy plain text:** Render as now: e.g. in a `<p className="... whitespace-pre-line">` so `\n` and `\n\n` are preserved. This keeps old and non-Luma events working.
- **HTML:** Render the sanitized HTML fragment inside a dedicated container using `dangerouslySetInnerHTML`. Use the same sanitizer on the client if we do client-side sanitization, or rely on server-side sanitization and still avoid injecting unsanitized user input.
- **Styling:** Use a wrapper class (e.g. `event-description-content`) and global or scoped CSS so that `p`, `ul`, `ol`, `li`, `hr`, `strong`, `a` etc. look correct and consistent with the rest of the app. Ensure links are styled and optionally open in a new tab with `rel="noopener noreferrer"`.
- **Places to update:** All components that currently render `event.description` (event page, event card, dashboard). For cards with `line-clamp-2`, consider clamping the wrapper or using CSS line-clamp on the HTML block so that long HTML descriptions still truncate nicely.

### 5. API and types

- **API:** No change to response shape; `description` remains a string. The string may be plain text or HTML depending on the source.
- **Types:** `Event.description` stays `string | undefined` (or `string | null` as in DB). No new type is required; the frontend differentiates by content (starts with `<` etc.) or by a separate flag if we add one later (e.g. `description_format: 'plain' | 'html'`).

### 6. Migration and backfill (optional)

- **Schema:** No migration required if we keep `description` as `TEXT`; it already holds strings.
- **Backfill:** Optionally run a one-off job to re-scrape or re-import Luma events to fill `description` with HTML. During the transition, the frontend must support both plain text and HTML as above.

### 7. Summary checklist

- [ ] Scraper: capture inner HTML of "About event" container and write to `luma_events.description`.
- [ ] Scraper or API: sanitize HTML (whitelist tags/attributes, safe `href`) before saving.
- [ ] Transfer/sync: pass `description` through to `events.description` without breaking HTML.
- [ ] Frontend: if description looks like HTML, render with `dangerouslySetInnerHTML` (after optional client-side sanitization); else render as plain text with `whitespace-pre-line`.
- [ ] Frontend: remove or reduce reliance on the temporary `whitespace-pre-line`-only path for HTML descriptions; keep it for legacy plain text.
- [ ] Styling: add wrapper class and styles for HTML description block (paragraphs, lists, links, etc.).
- [ ] (Optional) Backfill existing events with HTML descriptions and/or add `description_format` for explicit detection.

---

*This spec supersedes the temporary solution of displaying plain-text descriptions with `whitespace-pre-line` for events whose description is stored as HTML. Legacy plain-text descriptions must continue to work.*
