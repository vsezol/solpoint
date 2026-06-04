"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Globe2,
  Loader2,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";

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

type RecentAnalyticsEventItem = {
  id: string;
  event_name: string;
  event_level: "info" | "warn" | "error";
  page_path: string | null;
  payload: Record<string, unknown>;
  session_id: string | null;
  user_id: string | null;
  created_at: string;
};

type UsersAnalyticsResponse = {
  total_users: number;
  new_users_7d: number;
  new_users_30d: number;
  users_by_country: CountryStatsItem[];
  users_by_role: RoleStatsItem[];
  auth_without_profile_count: number;
  auth_without_profile: AuthWithoutProfileItem[];
  registered_without_country_count: number;
  registered_without_country: AnalyticsUserListItem[];
  registered_with_country_count: number;
  registered_with_country: AnalyticsUserListItem[];
  anonymous_sessions_without_registration_count: number;
  anonymous_sessions_without_registration: AnonymousVisitSessionItem[];
  recent_error_events_count: number;
  recent_error_events: RecentAnalyticsEventItem[];
  recent_click_events_count: number;
  recent_click_events: RecentAnalyticsEventItem[];
  generated_at: string;
  error?: string;
};

function formatRoleLabel(role: string): string {
  if (role === "unspecified") {
    return "Unspecified";
  }
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPersonName(
  twitterName: string | null | undefined,
  twitterHandle: string | null | undefined
): string {
  if (twitterName?.trim()) return twitterName;
  if (twitterHandle?.trim()) return `@${twitterHandle.replace(/^@+/, "")}`;
  return "Unknown user";
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<UsersAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countriesPage, setCountriesPage] = useState(1);

  const countriesPerPage = 10;

  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      router.push("/");
    }
  }, [authLoading, router, user]);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.is_admin) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/analytics/users", {
        cache: "no-store",
      });
      const payload = (await response.json()) as UsersAnalyticsResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load user analytics");
      }

      setData(payload);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load user analytics"
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.is_admin]);

  useEffect(() => {
    if (user?.is_admin) {
      fetchAnalytics();
    }
  }, [fetchAnalytics, user?.is_admin]);

  const knownCountries = useMemo(
    () =>
      (data?.users_by_country || []).filter(
        (country) => Boolean(country.country_code || country.country_name)
      ),
    [data?.users_by_country]
  );

  const totalCountries = knownCountries.length;
  const totalCountriesPages = Math.max(
    1,
    Math.ceil(totalCountries / countriesPerPage)
  );

  const countriesPageItems = useMemo(() => {
    const start = (countriesPage - 1) * countriesPerPage;
    return knownCountries.slice(start, start + countriesPerPage);
  }, [countriesPage, knownCountries]);

  const countriesStartIndex =
    totalCountries === 0 ? 0 : (countriesPage - 1) * countriesPerPage + 1;
  const countriesEndIndex = Math.min(
    countriesPage * countriesPerPage,
    totalCountries
  );

  useEffect(() => {
    setCountriesPage(1);
  }, [totalCountries]);

  useEffect(() => {
    if (countriesPage > totalCountriesPages) {
      setCountriesPage(totalCountriesPages);
    }
  }, [countriesPage, totalCountriesPages]);

  if (authLoading) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen bg-[var(--color-background)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </main>
        <Footer />
      </>
    );
  }

  if (!user?.is_admin) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--color-background)] pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
                  User Analytics
                </h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Overview of users, countries, and role distribution.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/admin")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={fetchAnalytics}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-[var(--color-error)] bg-[var(--color-error)]/10 p-4 text-[var(--color-error)]">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : data ? (
              <>
                <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Total users
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                      {data.total_users}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      New users (7 days)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                      {data.new_users_7d}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      New users (30 days)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                      {data.new_users_30d}
                    </p>
                  </div>
                </div>

                <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Anonymous sessions without registration
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                      {data.anonymous_sessions_without_registration_count}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Sessions that visited pages but never created a profile.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Auth users without profile
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                      {data.auth_without_profile_count}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Started auth but did not complete profile creation.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Registered without country
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                      {data.registered_without_country_count}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Profile exists, country code is missing.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Registered with country
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                      {data.registered_with_country_count}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Profile exists with country code set.
                    </p>
                  </div>
                </div>

                <div className="mb-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Recent error events
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                      {data.recent_error_events_count}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Last 50 frontend/runtime errors captured from users.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Recent click events
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                      {data.recent_click_events_count}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Last 80 clicks to reconstruct user path before drop-offs.
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
                      <Globe2 className="h-5 w-5" />
                      Countries
                    </h2>
                    {countriesPageItems.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        No country data yet.
                      </p>
                    ) : (
                      <>
                        <ul className="space-y-2">
                          {countriesPageItems.map((country) => (
                            <li
                              key={`${country.country_code || "unknown"}-${country.country_name || "unknown"}`}
                              className="flex items-center justify-between rounded border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                  {country.country_name || "Unknown country"}
                                </p>
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                  {country.country_code || "N/A"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                  {country.users_count}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Showing {countriesStartIndex}-{countriesEndIndex} of{" "}
                            {totalCountries} countries
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCountriesPage((prev) => Math.max(1, prev - 1))
                              }
                              disabled={countriesPage <= 1}
                            >
                              Prev
                            </Button>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              Page {countriesPage}/{totalCountriesPages}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCountriesPage((prev) =>
                                  Math.min(totalCountriesPages, prev + 1)
                                )
                              }
                              disabled={countriesPage >= totalCountriesPages}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                      Total countries with registered users: {totalCountries}
                    </p>
                  </section>

                  <section className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
                      <Users className="h-5 w-5" />
                      Roles distribution
                    </h2>
                    {!data.users_by_role.length ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        No role data yet.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {data.users_by_role.map((role) => (
                          <li
                            key={role.role}
                            className="flex items-center justify-between rounded border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 py-2"
                          >
                            <p className="text-sm text-[var(--color-text-primary)]">
                              {formatRoleLabel(role.role)}
                            </p>
                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                              {role.users_count}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
                  <section className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
                      Anonymous sessions
                    </h2>
                    {!data.anonymous_sessions_without_registration.length ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        No sessions in this segment.
                      </p>
                    ) : (
                      <ul className="max-h-[420px] space-y-2 overflow-auto pr-1">
                        {data.anonymous_sessions_without_registration.map((session) => (
                          <li
                            key={session.session_id}
                            className="rounded border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 py-2"
                          >
                            <p className="text-xs font-medium text-[var(--color-text-primary)]">
                              Session: {session.session_id.slice(0, 12)}...
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                              Last path: {session.last_path || "Unknown"}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              Page views: {session.page_views}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              First seen: {new Date(session.first_seen_at).toLocaleString()}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              Last seen: {new Date(session.last_seen_at).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
                      Auth users without profile
                    </h2>
                    {!data.auth_without_profile.length ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        No users in this segment.
                      </p>
                    ) : (
                      <ul className="max-h-[420px] space-y-2 overflow-auto pr-1">
                        {data.auth_without_profile.map((item) => (
                          <li
                            key={item.id}
                            className="rounded border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 py-2"
                          >
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              {formatPersonName(item.twitter_name, item.twitter_handle)}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              @{item.twitter_handle || "no-handle"}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                              Created: {new Date(item.created_at).toLocaleString()}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              Last sign in:{" "}
                              {item.last_sign_in_at
                                ? new Date(item.last_sign_in_at).toLocaleString()
                                : "Never"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
                      Registered without country
                    </h2>
                    {!data.registered_without_country.length ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        No users in this segment.
                      </p>
                    ) : (
                      <ul className="max-h-[420px] space-y-2 overflow-auto pr-1">
                        {data.registered_without_country.map((item) => (
                          <li
                            key={item.id}
                            className="rounded border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 py-2"
                          >
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              {formatPersonName(item.twitter_name, item.twitter_handle)}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              @{item.twitter_handle || "no-handle"}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                              Created: {new Date(item.created_at).toLocaleString()}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              Last active:{" "}
                              {item.last_active_at
                                ? new Date(item.last_active_at).toLocaleString()
                                : "No activity"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
                      Registered with country
                    </h2>
                    {!data.registered_with_country.length ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        No users in this segment.
                      </p>
                    ) : (
                      <ul className="max-h-[420px] space-y-2 overflow-auto pr-1">
                        {data.registered_with_country.map((item) => (
                          <li
                            key={item.id}
                            className="rounded border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 py-2"
                          >
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              {formatPersonName(item.twitter_name, item.twitter_handle)}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              @{item.twitter_handle || "no-handle"}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                              {item.country || "Unknown country"} {item.country_code ? `(${item.country_code})` : ""}
                              {item.city ? ` • ${item.city}` : ""}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              Last active:{" "}
                              {item.last_active_at
                                ? new Date(item.last_active_at).toLocaleString()
                                : "No activity"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <section className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
                      <AlertTriangle className="h-5 w-5" />
                      Recent errors
                    </h2>
                    {!data.recent_error_events.length ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        No recent errors recorded.
                      </p>
                    ) : (
                      <ul className="max-h-[420px] space-y-2 overflow-auto pr-1">
                        {data.recent_error_events.map((item) => (
                          <li
                            key={item.id}
                            className="rounded border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 py-2"
                          >
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              {item.event_name}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              {item.page_path || "Unknown path"}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              Session: {item.session_id ? `${item.session_id.slice(0, 12)}...` : "N/A"}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
                      <MousePointerClick className="h-5 w-5" />
                      Recent clicks
                    </h2>
                    {!data.recent_click_events.length ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        No recent click events recorded.
                      </p>
                    ) : (
                      <ul className="max-h-[420px] space-y-2 overflow-auto pr-1">
                        {data.recent_click_events.map((item) => (
                          <li
                            key={item.id}
                            className="rounded border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 py-2"
                          >
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              {item.event_name}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              {item.page_path || "Unknown path"}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              Session: {item.session_id ? `${item.session_id.slice(0, 12)}...` : "N/A"}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>

                <p className="mt-4 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <ShieldCheck className="h-4 w-4" />
                  Generated at: {new Date(data.generated_at).toLocaleString()}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
