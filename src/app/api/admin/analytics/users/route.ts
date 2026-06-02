import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

type ProfileAnalyticsRow = {
  id: string;
  twitter_handle: string | null;
  twitter_name: string | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  role: string | null;
  last_active_at: string | null;
  created_at: string;
};

type CountryStatsItem = {
  country_code: string | null;
  country_name: string | null;
  users_count: number;
};

type RoleStatsItem = {
  role: string;
  users_count: number;
};

type AnalyticsUserListItem = {
  id: string;
  twitter_handle: string | null;
  twitter_name: string | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  created_at: string;
  last_active_at: string | null;
};

type AuthWithoutProfileItem = {
  id: string;
  twitter_handle: string | null;
  twitter_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

type AnonymousVisitSessionItem = {
  session_id: string;
  first_seen_at: string;
  last_seen_at: string;
  page_views: number;
  last_path: string | null;
  referrer: string | null;
};

type AnalyticsEventItem = {
  id: string;
  event_name: string;
  event_level: "info" | "warn" | "error";
  page_path: string | null;
  payload: Record<string, unknown>;
  session_id: string | null;
  user_id: string | null;
  created_at: string;
};

function isUnknownCountry(item: CountryStatsItem): boolean {
  return !item.country_code && !item.country_name;
}

function hasCountryCode(row: Pick<ProfileAnalyticsRow, "country_code">): boolean {
  return Boolean(row.country_code && row.country_code.trim().length > 0);
}

/**
 * GET /api/admin/analytics/users
 * Returns aggregate user analytics for admin dashboard.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }

  const { data: rows, error } = await supabase.from("profiles").select(
    `
      id,
      twitter_handle,
      twitter_name,
      country,
      country_code,
      city,
      role,
      last_active_at,
      created_at
    `
  );

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }

  const profiles = (rows || []) as ProfileAnalyticsRow[];
  const profilesWithoutCountry: AnalyticsUserListItem[] = [];
  const profilesWithCountry: AnalyticsUserListItem[] = [];
  const profileIds = new Set<string>();
  const now = Date.now();
  const last7dThreshold = now - 7 * 24 * 60 * 60 * 1000;
  const last30dThreshold = now - 30 * 24 * 60 * 60 * 1000;

  const countriesMap = new Map<string, CountryStatsItem>();
  const rolesMap = new Map<string, RoleStatsItem>();

  let newUsers7d = 0;
  let newUsers30d = 0;

  for (const row of profiles) {
    profileIds.add(row.id);
    const createdAtTs = Date.parse(row.created_at);
    if (Number.isFinite(createdAtTs)) {
      if (createdAtTs >= last7dThreshold) {
        newUsers7d += 1;
      }
      if (createdAtTs >= last30dThreshold) {
        newUsers30d += 1;
      }
    }

    const countryCode = row.country_code ? row.country_code.toUpperCase() : null;
    const countryName = row.country?.trim() || null;
    const countryKey = countryCode || countryName || "UNKNOWN";

    const existingCountry = countriesMap.get(countryKey);
    if (existingCountry) {
      existingCountry.users_count += 1;
    } else {
      countriesMap.set(countryKey, {
        country_code: countryCode,
        country_name: countryName,
        users_count: 1,
      });
    }

    const role = row.role || "unspecified";
    const existingRole = rolesMap.get(role);
    if (existingRole) {
      existingRole.users_count += 1;
    } else {
      rolesMap.set(role, { role, users_count: 1 });
    }

    const listItem: AnalyticsUserListItem = {
      id: row.id,
      twitter_handle: row.twitter_handle || null,
      twitter_name: row.twitter_name || null,
      country: row.country || null,
      country_code: row.country_code || null,
      city: row.city || null,
      created_at: row.created_at,
      last_active_at: row.last_active_at || null,
    };

    if (hasCountryCode(row)) {
      profilesWithCountry.push(listItem);
    } else {
      profilesWithoutCountry.push(listItem);
    }
  }

  const usersByCountry = [...countriesMap.values()].sort((a, b) => {
    const aUnknown = isUnknownCountry(a);
    const bUnknown = isUnknownCountry(b);

    // Keep users with missing country at the very end.
    if (aUnknown !== bUnknown) {
      return aUnknown ? 1 : -1;
    }

    return b.users_count - a.users_count;
  });
  const usersByRole = [...rolesMap.values()].sort(
    (a, b) => b.users_count - a.users_count
  );

  const sortByNewest = <T extends { created_at: string }>(items: T[]): T[] =>
    items.sort(
      (a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || "")
    );

  sortByNewest(profilesWithoutCountry);
  sortByNewest(profilesWithCountry);

  const serviceRoleClient = createServiceRoleClient() as any;
  const authUsersWithoutProfile: AuthWithoutProfileItem[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data: usersPage, error: listUsersError } =
      await serviceRoleClient.auth.admin.listUsers({
        page,
        perPage,
      });

    if (listUsersError) {
      return NextResponse.json(
        { error: listUsersError.message || "Failed to fetch auth users" },
        { status: 500 }
      );
    }

    const batch = usersPage?.users || [];
    for (const authUser of batch) {
      if (profileIds.has(authUser.id)) {
        continue;
      }

      authUsersWithoutProfile.push({
        id: authUser.id,
        twitter_handle:
          (authUser.user_metadata?.preferred_username as string | undefined) ||
          (authUser.user_metadata?.user_name as string | undefined) ||
          null,
        twitter_name:
          (authUser.user_metadata?.full_name as string | undefined) ||
          (authUser.user_metadata?.name as string | undefined) ||
          null,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at || null,
      });
    }

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  sortByNewest(authUsersWithoutProfile);

  let anonymousSessionsCount = 0;
  let anonymousSessions: AnonymousVisitSessionItem[] = [];
  let analyticsErrors: AnalyticsEventItem[] = [];
  let analyticsClicks: AnalyticsEventItem[] = [];

  const { count: anonymousCount, error: anonymousCountError } = await serviceRoleClient
    .from("site_visit_sessions")
    .select("*", { count: "exact", head: true })
    .is("registered_user_id", null);

  if (!anonymousCountError) {
    anonymousSessionsCount = anonymousCount || 0;

    const { data: anonymousSessionsRows, error: anonymousSessionsError } =
      await serviceRoleClient
        .from("site_visit_sessions")
        .select("session_id, first_seen_at, last_seen_at, page_views, last_path, referrer")
        .is("registered_user_id", null)
        .order("last_seen_at", { ascending: false })
        .limit(200);

    if (anonymousSessionsError) {
      return NextResponse.json(
        { error: anonymousSessionsError.message || "Failed to fetch anonymous sessions" },
        { status: 500 }
      );
    }

    anonymousSessions = (anonymousSessionsRows || []) as AnonymousVisitSessionItem[];
  } else if (anonymousCountError.code !== "42P01") {
    return NextResponse.json(
      { error: anonymousCountError.message || "Failed to count anonymous sessions" },
      { status: 500 }
    );
  }

  const { data: analyticsEventsRows, error: analyticsEventsError } = await serviceRoleClient
    .from("analytics_events")
    .select("id, event_name, event_level, page_path, payload, session_id, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(400);

  if (analyticsEventsError && analyticsEventsError.code !== "42P01") {
    return NextResponse.json(
      { error: analyticsEventsError.message || "Failed to fetch analytics events" },
      { status: 500 }
    );
  }

  const analyticsEvents = ((analyticsEventsRows || []) as AnalyticsEventItem[]).map((event) => ({
    ...event,
    payload: event.payload || {},
  }));

  analyticsErrors = analyticsEvents
    .filter(
      (event) =>
        event.event_level === "error" ||
        event.event_name.toLowerCase().includes("error") ||
        event.event_name.toLowerCase().includes("exception")
    )
    .slice(0, 50);

  analyticsClicks = analyticsEvents
    .filter((event) => event.event_name === "ui_click" || event.event_name.endsWith("_click"))
    .slice(0, 80);

  return NextResponse.json(
    {
      total_users: profiles.length,
      new_users_7d: newUsers7d,
      new_users_30d: newUsers30d,
      users_by_country: usersByCountry,
      users_by_role: usersByRole,
      auth_without_profile_count: authUsersWithoutProfile.length,
      auth_without_profile: authUsersWithoutProfile,
      registered_without_country_count: profilesWithoutCountry.length,
      registered_without_country: profilesWithoutCountry,
      registered_with_country_count: profilesWithCountry.length,
      registered_with_country: profilesWithCountry,
      anonymous_sessions_without_registration_count: anonymousSessionsCount,
      anonymous_sessions_without_registration: anonymousSessions,
      recent_error_events_count: analyticsErrors.length,
      recent_error_events: analyticsErrors,
      recent_click_events_count: analyticsClicks.length,
      recent_click_events: analyticsClicks,
      generated_at: new Date().toISOString(),
    },
    { status: 200 }
  );
}
