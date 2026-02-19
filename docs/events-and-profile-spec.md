# Events & Profile — Functional Specification

**Purpose:** Business and technical specification for the **Events** and **Profile** areas of SolPoint. Intended for developers building a React Native (or other) copy of the app: API contracts, UX flows, and business rules in one place.

**Audience:** Product, BA, mobile/frontend developers.

---

# Part 1 — Events

## 1.1 Scope and User Roles

| Actor | Description |
|-------|-------------|
| **Guest** | Not logged in. Can browse public events list and open public event details only. Cannot search, filter, create events, or see full attendee lists. |
| **Logged-in user (Free)** | Can search/filter events, view public and own event details, see limited attendee info. Cannot create events or see "Friends attending" / full attendees (PRO feature). |
| **PRO user (VIP)** | Can create events, see VIP-only events, see "Friends attending" and full attendees list, use all filters. |

**Event visibility:**
- **public** — visible to everyone; details visible to any logged-in user.
- **vip_only** — visible in list and detail only to PRO users; otherwise 404.

---

## 1.2 Events — User Flows

### Flow 1: Browse events list (`/events`)

1. User opens Events page.
2. **Data:** Client calls `GET /api/events` (optional query: `event_type`, `upcoming`, etc.). For non-VIP, backend returns only `visibility=public` events.
3. **Client-side:** Events are split into **Upcoming** (start_date ≥ now) and **Past** (start_date < now). Optional client-side sort: local (user’s country) → recommended → by start_date.
4. **Search:** Client-side filter by search query (name, city, country, description). Search/filter usage requires login; if guest uses search/filter → show **Auth required** modal.
5. **Filter by type:** Tags "All Events" | "Official" | "Community" | "Meetup" | "Private". Changing filter refetches `GET /api/events?event_type=...`. Requires login; otherwise Auth modal.
6. **Create event:** Button "Host an event". If guest → Auth modal. If Free → **PRO required** modal. If PRO → open Create Event modal.

### Flow 2: View event detail (`/events/[slug]`)

1. **Routing:** `[slug]` can be event **slug** or event **UUID**.
2. **Data (server):** Event is loaded from DB by slug or ID. If `visibility === 'vip_only'` and user is not PRO → **notFound()** (404).
3. **Page content:** Hero image (or gradient placeholder), badges (type, visibility, paid/free), title, description, Event Details card (date/time, tickets, visibility, location, links), **Luma CTA** (see below), Hosts (internal + external organizers), **Attendees widget** (sidebar).
4. **Attendees widget:**  
   - If not logged in: show message that login is required.  
   - If Free: show only count or limited preview; "Show all" / "Friends" require PRO.  
   - If PRO: **"Attendees"** tab → `GET /api/events/{identifier}/attendees`. **"Friends"** tab → `GET /api/events/{identifier}/friends`. Both use `identifier` = slug or UUID.

### Flow 3: Create event (PRO only)

1. User clicks "Host an event" (PRO only).
2. Modal opens with **Create Event** form.
3. **Required fields:** `name`, `start_date`, `luma_link`. If location is set, `latitude` and `longitude` are required.
4. **Optional:** description, image_url, country, country_code, city, address, venue_name, end_date, timezone, event_type, visibility, is_paid, price_sol, price_usd, max_attendees, registration_deadline, is_online, socials, contacts, hub_id | community_id | project_id (owner entity).
5. **Owner logic:** If `hub_id` / `community_id` / `project_id` is sent, backend checks that current user is owner of that entity; then `owner_type` and `owner_id` are set to that entity. Otherwise owner = current user.
6. **Slug:** Backend generates unique slug from name + city (or "global") + start_date.
7. **Submit:** `POST /api/events` with JSON body. On success: close modal, refresh list, redirect to ` /events/{event.slug}`.

### Flow 4: Attend / Register (Luma-first)

- Primary CTA on event page is **Luma** (e.g. "Attend on Luma" / "Buy tickets" linking to `event.luma_link`).
- **LumaAttendButton** behavior: if user clicks, open Luma link in new tab, set `sessionStorage`/`localStorage` flags; on return to app tab, optionally show "Have you registered on Luma?" and then **Register on SolPoint** (internal registration).
- **Internal registration (optional):**  
  - Register: `POST /api/events/{identifier}/members` body `{ "status": "going" | "maybe" | "not_going" }`.  
  - Unregister: `DELETE /api/events/{identifier}/members` (current user).  
  - Change status: `PATCH /api/events/{identifier}/members` body `{ "status": "going" | "maybe" | "not_going" }`.  
- Rules: registration_deadline, max_attendees (for "going"), no duplicate registration; VIP event requires PRO.

---

## 1.3 Events — API Reference

Base path: `/api/events` (and `/api/events/[identifier]`). All requests are to the app backend (no direct DB from client). Auth: session cookie / Supabase auth.

### GET /api/events

List events with filters.

| Query param | Type | Description |
|-------------|------|-------------|
| country | string | Filter by country name (legacy) |
| country_code | string | Filter by ISO 3166-1 alpha-2 (e.g. US) |
| city | string | Filter by city |
| event_type | string | official \| community \| private \| meetup |
| visibility | string | public \| vip_only (if omitted and user not VIP, only public is returned) |
| is_online | boolean | true \| false |
| is_paid | boolean | true \| false |
| is_recommended | boolean | true \| false |
| upcoming | boolean | if "true", only start_date ≥ now |
| limit | number | default 50 |
| offset | number | default 0 |

**Response:** `{ "events": Event[] }`. Each event includes `source: "solpoint" | "external"` (external if `luma_event_id` is set).

**Auth:** Optional. If not authenticated, only public events are returned.

---

### POST /api/events

Create event. **Auth required.** In practice, **PRO required** (enforced on frontend).

**Body (JSON):**

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| name | string | yes | |
| start_date | string (ISO) | yes | |
| luma_link | string | yes | |
| description | string | no | |
| image_url | string | no | |
| country | string | no | If location set, coordinates required |
| country_code | string | no | |
| city | string | no | |
| address | string | no | |
| venue_name | string | no | |
| latitude | number | conditional | Required if country is set |
| longitude | number | conditional | Required if country is set |
| end_date | string (ISO) | no | |
| timezone | string | no | |
| event_type | string | no | default "community" |
| visibility | string | no | default "public" |
| is_paid | boolean | no | default false |
| price_sol | number | no | |
| price_usd | number | no | |
| max_attendees | number | no | |
| registration_deadline | string (ISO) | no | |
| is_online | boolean | no | default false |
| socials | object | no | twitter, instagram, facebook, website, luma, etc. |
| contacts | object | no | |
| hub_id | UUID | no | Must be owner of hub |
| community_id | UUID | no | Must be owner of community |
| project_id | UUID | no | Must be owner of project |

**Response:** `201` `{ "event": Event }`.

**Errors:** 400 (validation), 401 (unauthorized), 403 (not owner of entity), 404 (hub/community/project not found), 500.

---

### GET /api/events/[identifier]

Get single event by **slug** or **UUID**. Public for public events; for `vip_only`, user must be PRO.

**Response:** `200` `{ "event": Event }`. Event includes `organizers: { internal: User[], external: ExternalUser[] }`.

**Errors:** 403 (PRO only), 404 (not found), 500.

---

### GET /api/events/[identifier]/attendees

Full list of attendees (status "going"). **Auth required. PRO required.**

**Response:** `200` `{ "items": Array<{ id, avatar_url, name, twitter_handle, isVip, isVerified }> }`.

**Errors:** 401, 403 (PRO required), 404 (event not found), 500.

---

### GET /api/events/[identifier]/friends

List of **current user’s friends** who are attending this event. **Auth required. PRO required.**

**Response:** `200` `{ "items": Array<{ id, avatar_url, name, twitter_handle, isVip, isVerified }> }`.

**Errors:** 401, 403 (PRO required), 404, 500.

---

### GET /api/events/[identifier]/members

List event members (internal SolPoint users + optional external Luma attendees). **Auth required.** For VIP events, PRO required.

| Query param | Type | Description |
|-------------|------|-------------|
| status | string | going \| maybe \| not_going (optional filter) |

**Response:** `200` `{ "internal": EventMember[], "external": ExternalAttendee[] }`.

---

### POST /api/events/[identifier]/members

Register for event. **Auth required.**

**Body:** `{ "status": "going" | "maybe" | "not_going" }`.

**Rules:**  
- Event must exist and be accessible (public or user is PRO for vip_only).  
- registration_deadline not passed.  
- No existing registration for this user.  
- If status "going" and event has max_attendees, attendees_count < max_attendees.

**Response:** `201` `{ "member": EventMember }`.

**Errors:** 400 (already registered, deadline passed, event full, invalid status), 401, 403 (PRO only event), 404, 500.

---

### DELETE /api/events/[identifier]/members

Unregister current user from event. **Auth required.** No body. **Response:** `200` `{ "message": "..." }`.

---

### PATCH /api/events/[identifier]/members

Update current user’s attendance status. **Auth required.**

**Body:** `{ "status": "going" | "maybe" | "not_going" }`.

**Response:** `200` with updated member or success message. **Errors:** 400 (invalid status), 401, 404, 500.

---

### Other event APIs (for completeness)

- **GET/POST/DELETE** `/api/events/[identifier]/image` — event image upload/delete (multipart/form-data for POST).
- **POST** `/api/events/[identifier]/transfer-ownership` — transfer event ownership (body: new owner params).
- **DELETE** `/api/events/[identifier]/members/[userId]` — remove member (organizer/owner).
- **PATCH** `/api/events/[identifier]/members/[userId]/role` — change member role.

These are used from dashboard/admin flows rather than the public Events list/detail pages.

---

## 1.4 Events — Business Rules Summary

- **Visibility:** Non-PRO users never see `vip_only` events (list and detail return 404 or filtered out).
- **Search & filters:** Allowed only when logged in; otherwise show Auth modal.
- **Create event:** PRO only (frontend blocks Free; backend only checks auth).
- **Attendees / Friends at event:** Full list and "Friends" tab require PRO.
- **Sorting (client):** After fetch, sort by: local (user country) → recommended → start_date.
- **Slug:** Unique per event; generated from name + city (or "global") + start_date.
- **Owner:** Event can be owned by user, hub, community, or project; creator must be owner of linked entity if hub/community/project is set.

---

# Part 2 — Profile

## 2.1 Scope and User Roles

| Actor | Description |
|-------|-------------|
| **Guest** | Can open public profile by username (`/profile/[username]`). Sees public info only; no friends list, no edit, no stats/invites. |
| **Logged-in (own profile)** | Full profile: edit, banner, open-to-meet, invites, friends list, friend requests, affiliations, stats, users list (PRO). |
| **Logged-in (other’s profile)** | See public profile + Add friend, friendship status, mutual friends count; PRO can see "Users in country/city" lists. |

**Profile identifier:** URL is `/profile/[username]`. `username` is `twitter_handle` (with or without leading `@`). Profile is loaded from `profiles` by `twitter_handle`.

---

## 2.2 Profile — User Flows

### Flow 1: View profile (`/profile/[username]`)

1. User opens `/profile/{twitter_handle}` (e.g. `/profile/john` or `/profile/@john`).
2. **Server:** Resolve profile by `twitter_handle` (strip `@`). If not found → 404.
3. **Data:** Profile is passed to client (server component). Client then loads:
   - **Profile data:** `GET /api/profile/data?user_id={id}` → pastEvents, friendsCount, friendshipStatus, upcomingEvents.
   - **Stats:** `GET /api/profile/stats?country_code=...&city=...` → total, inCountry, inCity (user counts).
   - **Affiliations:** `GET /api/profile/affiliations` (own) or `?user_id={id}` (other) → hubs, communities, projects, workspaces, events.
   - If own profile: invites, mutual followers (Twitter), subscription (PRO), friend requests count.
4. **Own vs other:** `isOwnProfile = (authUser?.id === user.id)`. Edit, banner upload, invites, "Open to meet" toggle, create entity — only on own profile.

### Flow 2: Edit profile (own)

1. User clicks "Edit profile". Modal/sheet with **ProfileEditForm**.
2. **Editable fields:** bio (max 150), role (enum), is_open_to_meet, country, country_code, city, socials (instagram, facebook, telegram, youtube, discord, github, linkedin, medium, substack). Twitter is from account, not editable in socials.
3. **Submit:** `PATCH /api/profile/update` with JSON. On success, refresh profile or update local state.

### Flow 3: Banner (own)

1. User uploads image (or removes). **POST** `/api/profile/banner` with `FormData` (file). Allowed types: JPEG, PNG, WebP, GIF; max 5MB.
2. Backend stores in Supabase Storage (`profile-banners`), updates `profiles.banner_url`. Old file is deleted.
3. **DELETE** `/api/profile/banner` removes banner and clears `banner_url`.

### Flow 4: Open to meet (own)

1. Toggle "Open to meet" in UI. **PATCH** `/api/profile/open-to-meet` body `{ "is_open_to_meet": true | false }`.
2. No additional params. Auth required.

### Flow 5: Add friend / Friend status (other’s profile)

1. **Status:** From `GET /api/profile/data?user_id={id}` → `friendshipStatus`: `none` | `pending_sent` | `pending_received` | `accepted`.
2. **Add friend:** Button "Add friend" → **POST** `/api/friends` body `{ "friend_id": "<user_id>" }`. Backend creates follow (follower_id = current user, following_id = target). If target already follows current user → mutual (friends). Response includes `isMutual`.
3. **Unfriend:** **DELETE** `/api/friends` with body `{ "friend_id": "<user_id>" }` (or query). Removes follow from current user to target (mutual friendship becomes one-way or none).
4. **Friend requests (own profile):** **GET** `/api/friends/requests` → list of users who follow current user but current user doesn’t follow. Accept: **POST** `/api/friends/requests` body `{ "friend_id": "..." }`. Decline: **DELETE** `/api/friends/requests?friend_id=...`.

### Flow 6: Friends list (mutual / followers / following)

1. **GET** `/api/friends/list?user_id={id}&type=mutual|followers|following`.
2. **mutual** — mutual friends (both follow each other). **followers** — who follows this user. **following** — who this user follows.
3. Used in profile sidebar and modals (e.g. "X friends", open list).

### Flow 7: Invites (own profile, PRO)

1. **GET** `/api/invites` — list current user’s invite codes and usage.
2. **POST** `/api/invites` — create invite: body `{ "max_uses": number | null, "expires_at": string | null }`. Returns `{ "data": { code, ... } }`.
3. User copies link/code to invite others. Use invite: **POST** `/api/invites/use` (code in body or query).

### Flow 8: Users list (PRO) — "X users in country/city"

1. **GET** `/api/users/list?filter=all|country|city&country_code=...&city=...&limit=1000&offset=0`.
2. Requires auth; frontend restricts to PRO. Used in profile to show "Total users", "In country", "In city" with modals listing users (and optionally friends among them).

### Flow 9: Subscription (PRO) check

1. **GET** `/api/subscriptions/current` — current user’s subscription (e.g. tier). Used to show PRO badge and gate PRO features (create event, attendees, users list, etc.).

---

## 2.3 Profile — API Reference

### GET /api/profile/data

Profile payload: past events, friends count, friendship status, upcoming events.

| Query param | Type | Description |
|-------------|------|-------------|
| user_id | UUID | Profile user id (required) |

**Response:**  
`{ "pastEvents": Event[], "friendsCount": number, "friendshipStatus": "none" | "pending_sent" | "pending_received" | "accepted", "upcomingEvents": Event[] }`

- **pastEvents:** Events user attended (event_members with status "going", start_date in past).  
- **friendsCount:** Count of mutual friends (from mutual_friends view).  
- **friendshipStatus:** Only for other’s profile when logged in; from follows table (both directions).  
- **upcomingEvents:** Upcoming events in **current user’s** country (for recommendation block).

**Auth:** Optional. If not auth, friendshipStatus and some data may be limited.

---

### PATCH /api/profile/update

Update current user’s profile. **Auth required.**

**Body (all optional):**

| Field | Type | Validation |
|-------|------|------------|
| bio | string \| null | max 150 |
| role | string | enum: degen, developer, trader, investor, designer, founder, other |
| is_open_to_meet | boolean | |
| country | string \| null | max 100 (legacy) |
| country_code | string \| null | ISO 3166-1 alpha-2 |
| city | string \| null | max 150 |
| socials | object \| null | instagram, facebook, telegram, youtube, discord, github, linkedin, medium, substack (twitter derived from twitter_handle) |

**Response:** `200` `{ "profile": Profile }`. **Errors:** 400 (validation), 401, 500.

---

### GET /api/profile/stats

User counts (for "X users in country/city" and total).

| Query param | Type | Description |
|-------------|------|-------------|
| country_code | string | ISO 3166-1 alpha-2 |
| city | string | |

**Response:** `{ "total": number, "inCountry": number | null, "inCity": number | null }`.  
**Auth:** Not required (public stats).

---

### GET /api/profile/affiliations

Hubs, communities, projects, workspaces, events the user is member or owner of.

| Query param | Type | Description |
|-------------|------|-------------|
| user_id | UUID | Optional; default current user |

**Response:** `{ "affiliations": Array<{ id, name, slug, image_url, type, country?, city?, start_date? }>, "count": number }`.  
**Auth required.**  
**Errors:** 401, 500.

---

### PATCH /api/profile/open-to-meet

Set `is_open_to_meet`. **Auth required.**  
**Body:** `{ "is_open_to_meet": boolean }`.  
**Response:** `200` `{ "profile": Profile }`.

---

### POST /api/profile/banner

Upload banner image. **Auth required.**  
**Body:** `multipart/form-data`, field `file`. Allowed: JPEG, PNG, WebP, GIF; max 5MB.  
**Response:** `200` `{ "banner_url": string }`.  
**Errors:** 400 (no file, invalid type/size), 401, 500.

---

### DELETE /api/profile/banner

Remove banner. **Auth required.** No body. **Response:** `200` `{ "success": true }`.

---

### POST /api/friends

Follow user (add friend / send request). **Auth required.**  
**Body:** `{ "friend_id": UUID }`.  
**Response:** `200` `{ "data": { follow, status, isMutual }, "message": "..." }`.  
**Errors:** 400 (already following, self-follow), 401, 500.

---

### DELETE /api/friends

Unfollow. **Auth required.**  
**Query:** `friend_id` (required).  
**Response:** 200 `{ "message": "Unfollowed successfully" }`. **Errors:** 400 (missing friend_id), 401, 500.

---

### GET /api/friends?user_id=... | friend_id=...

Check friendship / get status. **Auth required.**  
- `user_id` — list friends of that user (or similar).  
- `friend_id` — check relationship with that user.  
(Exact contract may vary; used by map and profile for status.)

---

### GET /api/friends/list

List friends or followers/following. **Auth required.**

| Query param | Type | Description |
|-------------|------|-------------|
| user_id | UUID | Required |
| type | string | mutual \| followers \| following |

**Response:** `{ "data": User[], "count": number, "type": string }`.

---

### GET /api/friends/requests

Incoming friend requests (who follows me but I don’t follow). **Auth required.**  
**Response:** `{ "data": User[], "count": number }`.

---

### POST /api/friends/requests

Accept request: follow back. **Auth required.**  
**Body:** `{ "friend_id": UUID }`.  
**Response:** `{ "message": "...", "isMutual": boolean }`.

---

### DELETE /api/friends/requests?friend_id=...

Decline request (remove their follow to me). **Auth required.**  
**Response:** 200.

---

### GET /api/friends/stats

Counts for current user (e.g. friends count, pending requests). **Auth required.**  
**Response:** e.g. `{ "friendsCount": number, "friendRequestsCount": number }`. (Exact keys from your implementation.)

---

### GET /api/users/list

List users with filters. **Auth required.** Frontend restricts to PRO.

| Query param | Type | Description |
|-------------|------|-------------|
| filter | string | all \| country \| city |
| country_code | string | For filter=country |
| city | string | For filter=city |
| limit | number | default 1000 |
| offset | number | default 0 |

**Response:** `{ "users": User[], "friends": User[] }` (or similar; friends = subset that are current user’s friends).

---

### GET /api/invites

Current user’s invite codes. **Auth required.**  
**Response:** List of invites (code, max_uses, expires_at, usage count, etc.).

---

### POST /api/invites

Create invite. **Auth required.**  
**Body:** `{ "max_uses": number | null, "expires_at": string | null }`.  
**Response:** `201` `{ "data": Invite }`.

---

### POST /api/invites/use

Use invite code (e.g. on signup). Body or query: code. (Exact path/contract from your codebase.)

---

### GET /api/twitter/mutual-followers

Twitter mutual followers (if integrated). **Auth required.** Used on profile for "X mutual followers on Twitter".

---

### GET /api/subscriptions/current

Current user’s subscription. **Auth required.**  
**Response:** e.g. `{ "tier": "free" | "vip", ... }`. Used for PRO gating.

---

## 2.4 Profile — Business Rules Summary

- **Profile resolution:** By `twitter_handle` (case-sensitive; strip leading `@`).
- **Friendship:** Asymmetric "follow". Mutual follow = friends. Friend request = they follow me, I don’t follow them. Accept = I follow them (mutual). Decline = delete their follow.
- **Edit / Banner / Open to meet / Invites:** Only own profile; auth required.
- **Users list (all/country/city):** PRO only on frontend; backend may allow any auth user.
- **Affiliations:** Hubs, communities, projects, workspaces (member or owner), events (attended, status "going").
- **Stats:** total users, users in country, users in city (public endpoint).
- **Subscription:** PRO (vip) unlocks create event, full attendees, friends at event, users list, invites, etc. Enforced on frontend; backend enforces only where documented (e.g. attendees/friends endpoints return 403 for non-PRO).

---

## 2.5 Profile — Page Structure (UX)

- **Header:** Banner (or gradient), avatar, name, @handle, role, location, "Open to meet" badge (if true), Edit (own) / Add friend (other).
- **Sidebar (or top blocks):** Stats (total/country/city users), Friends count + link to list, PRO badge, Invites (own), Mutual followers Twitter (own).
- **Main:** Bio, social links, Past events (from profile/data), Upcoming events (recommended by country), Affiliations (hubs, communities, projects, workspaces, events). Modals: Edit profile, Friends list, Friend requests, Users list (all/country/city), Create entity (hub/community/project/workspace).

---

# Appendix: Auth & Shared APIs

- **GET /api/auth/me** — Current user + profile (including subscription_tier, country_code, etc.). Used for isVip, isOwnProfile, and gating.
- **POST /api/auth/logout** — Log out.
- **GET /api/dashboard/has-entities** — Whether current user has any hubs/communities/projects/workspaces (for nav "Dashboard" link).

Use these in React Native to replicate login state, PRO checks, and navigation.

---

*Document version: 1.0. Covers Events and Profile as of the current codebase. For UI/visual system see `docs/brand-ui-styles.md`.*
