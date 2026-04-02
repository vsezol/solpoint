# Authentication — Functional Specification

**Purpose:** Business and technical specification for **Login**, **Sign up**, **Session**, **Logout** and related auth flows. For developers building a React Native or other client: API contracts, UX flows, and business rules.

**Audience:** Product, BA, mobile/frontend developers.

---

## 1. Overview

- **Provider:** Twitter OAuth only (via Supabase Auth).
- **Session:** Web uses server-side Supabase session via cookies. Mobile receives a short-lived one-time code from callback and exchanges it to `{access_token, refresh_token}` via `/api/auth/mobile/exchange`.
- **Profile:** After first Twitter sign-in a row in `profiles` is created (or updated). Registration is complete only after **location** (country required, city optional) and optionally **profile** (bio, role, open to meet) are filled on signup flow.

---

## 2. User Flows

### 2.1 Login (`/login`)

1. User opens Login page.
2. Single action: **"Continue with Twitter"** → redirect to **GET** `/api/auth/twitter` (optional query: `redirect_to`).
3. Server saves `redirect_to` in HTTP-only cookie `oauth_redirect_to` (max 10 min), then redirects to Supabase Twitter OAuth → Twitter → after consent redirects to **GET** `/api/auth/callback?code=...`.
4. Callback exchanges `code` for session, then redirects to `redirect_to` (default `/profile`) with `?auth=success`. If profile missing or incomplete, callback may redirect to `/signup` (see below).
5. On Login page, optional query `error` shows message:
   - `twitter_not_enabled` — Twitter OAuth not configured in Supabase.
   - `oauth_failed` — Supabase returned no URL.
   - `no_code` — Callback was opened without `code`.
   - Any other value — from Supabase (e.g. `error.message`).
6. **Links:** "Sign up" → `/signup`.

**Business rules:**

- No email/password; only Twitter.
- If user has no profile yet and came from `/login`, callback redirects to `/signup` with message to complete registration.
- If profile exists but `country_code` is missing or country is "Unknown", callback redirects to `/signup?step=location&message=...`.

---

### 2.2 Sign up (`/signup`)

Multi-step flow: **Twitter** → **Location** → **Profile** → **Complete**.

#### Step 1: Twitter

1. User opens Sign up (optionally with `?invite=CODE&redirect_to=URL`).
2. **"Sign up with Twitter"** → redirect to `/api/auth/twitter?redirect_to=<encoded_url>`, where `redirect_to` is back to signup with same query (e.g. `/signup?invite=CODE&redirect_to=...`).
3. After Twitter OAuth, callback:
   - If **no profile:** creates profile (twitter_id, twitter_handle, twitter_name, avatar_url, country="Unknown", country_code=null, city=null, subscription_tier=free, is_verified), then if `invite` in redirect URL applies invite (see Invite below), then redirects to **`/signup?step=location&auth=success`** (and preserves `invite`, `redirect_to`).
   - If **profile exists but location empty:** redirects to `/signup?step=location&auth=success&...`.
   - If **profile complete** and redirect was to signup: redirects to `/signup?step=profile&auth=success` or to `redirect_to` if present.

#### Step 2: Location

1. **Required:** Country (searchable list, stored as `country` + `country_code`).
2. **Optional:** City (searchable, from predefined list by country).
3. **"Continue"** → client moves to Step 3 (Profile). No API call yet.
4. URL can be opened with `?step=location` (e.g. after callback).

#### Step 3: Profile

1. **Optional fields:** Bio (max 150), Role (dropdown), Open to meet (toggle).
2. **"Complete"** → **PATCH** `/api/profile/update` with `{ country, country_code, city, bio, role, is_open_to_meet }`.
3. On success → Step 4 (Complete). If `redirect_to` was in URL, client redirects to it after short delay (e.g. 2s).
4. **Invite:** If user landed with `?invite=CODE`, client may call **POST** `/api/invites/use` with `{ "inviteCode": "CODE" }` at an appropriate moment (e.g. after profile creation or on step complete). Alternatively invite is applied in callback when profile is first created (see Callback).

#### Step 4: Complete

1. Success message and link to profile or redirect to `redirect_to`.

**Query params (signup):**

| Param       | Description                                      |
|------------|---------------------------------------------------|
| step       | `location` \| `profile` — open directly that step |
| invite     | Invite code (stored in localStorage and/or passed to callback) |
| redirect_to| Where to go after completion                      |
| message    | Info message (e.g. from callback)                  |
| auth       | `success` — set by callback; client clears from URL and refetches user |

**Business rules:**

- Country (and country_code) is required to consider registration complete.
- City is optional; visible only to PRO users (documented elsewhere).
- Invite: if used in callback, creates referral and mutual friendship with inviter. If used later, **POST /api/invites/use** does the same.

---

### 2.3 Session and current user (client)

1. **Current user + profile:** **GET** `/api/auth/me`. Returns `{ user, profile }` or `{ user: null, profile: null }`. Use `profile` as the main user entity (id, twitter_handle, subscription_tier, country_code, etc.).
2. **Session check:** **GET** `/api/auth/session`. Returns `{ session: { user: { id, email } } }` or `{ session: null, error?: string }`. Used to detect if user is logged in (e.g. after OAuth redirect or tab focus); then client can refetch `/api/auth/me`.
3. **After OAuth redirect:** URL has `?auth=success`. Client should invalidate auth query and remove `auth` from URL so UI shows logged-in state.
4. **Logout:** **POST** `/api/auth/logout`. Server calls Supabase `signOut()` and returns **302 redirect to `/`**. Client should then clear local user state and navigate to home (or login). For SPA/mobile, treat as success and navigate; redirect response may not be followed.

---

### 2.4 Logout

1. User triggers Logout (e.g. profile menu).
2. Client: **POST** `/api/auth/logout` (no body).
3. Server: `supabase.auth.signOut()`, then redirect to `/`.
4. Client: clear cached user/profile (e.g. React Query cache), set analytics user to null, navigate to `/` or `/login`.

---

### 2.5 Invite (registration)

- **Link:** User opens e.g. `https://app.example.com/signup?invite=ABC123`.
- **Storage:** Client can store `invite` in localStorage and pass same URL as `redirect_to` when starting Twitter OAuth so callback receives `redirect_to=/signup?invite=ABC123`.
- **Callback:** When profile is first created and `redirect_to` contains `invite`, callback looks up invite by code, validates (not expired, within max_uses, not self), creates `referrals` row and calls DB RPC `create_mutual_friendship(inviter, invited)`.
- **Alternative:** After signup, client calls **POST** `/api/invites/use` with `{ "inviteCode": "ABC123" }` (auth required). Same validation and referral + mutual friendship.

---

## 3. API Reference

### GET /api/auth/twitter

Initiates Twitter OAuth. **No auth required.**

**Query:**

| Param       | Type   | Description                                      |
|------------|--------|--------------------------------------------------|
| redirect_to| string | Where to land after auth. Default: `/profile`.   |

**Behavior:**

- Normalizes `redirect_to`:
  - web: relative path only (must start with `/`)
  - mobile: deep link scheme from allowlist (`MOBILE_DEEP_LINK_SCHEMES`, default `solpointmobile`)
  - invalid value fallback: `/profile`
- Sets cookie `oauth_redirect_to` = normalized `redirect_to` (httpOnly, 10 min).
- Calls Supabase `signInWithOAuth({ provider: "twitter", options: { redirectTo: origin + "/api/auth/callback" } })`.
- **Redirect 302** to Supabase/Twitter URL, or to `{origin}/login?error=...` on error (`oauth_failed` if no URL, or Supabase error message).

**Note:** `origin` is from `getAppOrigin(request.url.origin)` (e.g. production base URL). Callback URL is always `{origin}/api/auth/callback`.

---

### GET /api/auth/callback

OAuth callback. Supabase redirects here with `?code=...`. **No auth required.**

**Query:**

| Param       | Type   | Description                          |
|------------|--------|--------------------------------------|
| code       | string | Required. Exchange code for session.|
| redirect_to| string | Optional override; usually from cookie. |

**Behavior:**

1. Read `redirect_to` from cookie `oauth_redirect_to` (then delete cookie), else from query, else `/profile`.
2. Exchange `code` for session (`exchangeCodeForSession(code)`).
3. If `redirect_to` is a mobile deep link:
   - on success: generate one-time code (TTL 120s), save hashed code + session tokens in `mobile_oauth_handoffs`, redirect to deep link with `?auth=success&code=...`.
   - on error/no code: redirect to deep link with `?auth=error&error=...`.
4. If `redirect_to` is a web path:
   - on error → redirect `{origin}/login?error=...`.
   - if no `code` → redirect `{origin}/login?error=no_code`.
5. Load profile by `user.id`. Then for web flow:
   - **No profile:** Create profile from Twitter metadata; if `redirect_to` contains `invite`, apply invite (referral + mutual friendship); redirect to `/signup?step=location&auth=success` (preserve invite/redirect_to).
   - **Profile exists but** `country_code` null or country "Unknown": if redirect was `/profile` or `/login`, redirect to `/signup?message=...&step=location&auth=success`; if redirect was `/signup`, redirect to `/signup?step=location&auth=success&...`.
   - **Profile complete:** If redirect was `/signup`, may redirect to `/signup?step=profile&auth=success` or to `redirect_to`. Otherwise redirect to `{redirect_to}?auth=success`.

**Response:** Always **302 redirect** (no JSON).

---

### GET /api/auth/me

Returns current user and profile.  
Auth sources:
- Web: session cookie
- Mobile: `Authorization: Bearer <access_token>`

**Response:**

- **200**  
  - If logged in: `{ user: SupabaseUser, profile: Profile }`.  
  - If not logged in: `{ user: null, profile: null }`.

No 401; unauthenticated is expressed as null. Use `profile` for display name, subscription_tier, country_code, etc.

---

### POST /api/auth/mobile/exchange

Exchange mobile one-time OAuth code to session tokens. **No cookie required.**

**Body (JSON):** `{ "code": string }`

**Success (200):**
`{ access_token, refresh_token, token_type, expires_in, user_id }`

**Errors:**
- `400 { "error": "invalid_or_expired_code" }`
- `400 { "error": "code_already_used" }`
- `500 { "error": "internal_error" }`

`Cache-Control: no-store` is set for response.

---

### GET /api/auth/session

Lightweight session check. **Uses session (cookie).**

**Response:**

- **200**  
  - `{ session: { user: { id, email } } }` if logged in.  
  - `{ session: null, error?: string }` if not or on error.

Used to invalidate/refresh auth state (e.g. after OAuth return or focus). Full data from `/api/auth/me`.

---

### POST /api/auth/logout

Log out. **Uses session (cookie).**

**Body:** None.

**Response:**

- **302** redirect to `/` (or 500 on error).
- Client should clear local user state and navigate; for native/SPA, treat as success after POST.

**Errors:** **500** `{ error: message }` if signOut fails.

---

### POST /api/invites/use

Apply invite code for current user (e.g. after signup). **Auth required.**

**Body (JSON):** `{ "inviteCode": string }`

**Validation:**

- User must not have already used any invite (no row in `referrals` for this user).
- Invite must exist, not expired (`expires_at`), within `max_uses`, and not self-invite.

**On success:** Insert `referrals` row; call DB RPC `create_mutual_friendship(inviter_user_id, invited_user_id)`.

**Response:** **201** `{ data: referral }`.

**Errors:** **400** (already used, invalid/expired/max uses/self), **401**, **500**.

---

## 4. Client Usage (e.g. React Native)

1. **Login:** Open in browser or WebView: `GET {baseUrl}/api/auth/twitter?redirect_to={encodeURIComponent("solpointmobile://auth/callback")}`.
2. **Callback URL:** Must be configured in Supabase (and Twitter app) as `{baseUrl}/api/auth/callback`. For mobile, baseUrl is your backend; callback is server-side, then server redirects to your app scheme with params.
3. **Exchange:** After deep link return:
   - `auth=success&code=...` → call **POST** `/api/auth/mobile/exchange`.
   - `auth=error&error=...` → show error.
4. **Set session:** Put returned tokens into RN Supabase client (`setSession`).
5. **User state:** Call **GET** `/api/auth/me` with `Authorization: Bearer <access_token>`, then use `profile` as source of truth.
6. **Routing:** If `profile.country_code` missing, open onboarding/location flow; else go to main app.
7. **Logout:** **POST** `/api/auth/logout`, clear local state, navigate to login or home.
8. **Signup:** Same Twitter entry point; use `redirect_to=/signup` or `/signup?invite=...&redirect_to=...`. Handle multi-step (location, profile) via your app screens and **PATCH** `/api/profile/update` for the profile step. Invite can be applied in callback (server) or via **POST** `/api/invites/use` after login.

---

## 5. Business Rules Summary

- **Single provider:** Twitter OAuth only.
- **Profile creation:** On first Twitter sign-in, profile is created with Twitter data; country/city are set in signup flow (location step).
- **Registration complete:** When profile has `country_code` (and not "Unknown"). City and bio/role are optional.
- **redirect_to:** Stored in cookie for login/signup start; accepts only safe web path or allowlisted mobile deep link. Max 10 minutes.
- **Mobile handoff:** Callback returns one-time code (120s TTL, single-use). Tokens are never passed directly in deep-link URL.
- **Invite:** Optional. Applied in callback when profile is created and invite in URL, or via **POST /api/invites/use**. Creates referral and mutual friendship.
- **Logout:** Server-side signOut + redirect; client clears state and navigates.

---

## 6. Related Pages

- **/activate:** Subscription activation (payment intent). Opened with `?code=INTENT_ID` after payment. Not part of login/signup; requires user to be logged in to claim. See subscription docs.

---

*Document version: 1.0. For Events and Profile see `docs/events-and-profile-spec.md`. For UI see `docs/brand-ui-styles.md`.*
