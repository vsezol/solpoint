"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header, Footer } from "@/components/layout";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, Search, Star } from "lucide-react";

type VisibilityFilter = "all" | "public" | "vip_only";
type PeriodFilter = "upcoming" | "all";
type SortDirection = "asc" | "desc";

type MajorAdminEvent = {
  id: string;
  name: string | null;
  slug: string | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  visibility: "public" | "vip_only";
  is_major: boolean;
};

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type EventsMajorResponse = {
  events?: MajorAdminEvent[];
  pagination?: PaginationState;
  error?: string;
};

type UiMessage = {
  type: "success" | "error";
  text: string;
};

const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

function formatEventDate(value: string | null): string {
  if (!value) {
    return "TBD";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "TBD";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventListSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <li
          key={`events-major-skeleton-${index}`}
          className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-background)] p-4 animate-pulse"
        >
          <div className="h-4 w-2/3 rounded bg-[var(--color-surface-border)]" />
          <div className="mt-2 h-3 w-5/6 rounded bg-[var(--color-surface-border)]" />
          <div className="mt-2 h-3 w-1/2 rounded bg-[var(--color-surface-border)]" />
        </li>
      ))}
    </ul>
  );
}

export default function AdminEventsMajorPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [events, setEvents] = useState<MajorAdminEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [period, setPeriod] = useState<PeriodFilter>("upcoming");
  const [sort, setSort] = useState<SortDirection>("asc");
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      router.push("/");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const trimmed = searchInput.trim();
      setPage(1);
      setSearch(trimmed);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const fetchEvents = useCallback(async () => {
    if (!user?.is_admin) {
      return;
    }

    setIsLoadingEvents(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        visibility,
        period,
        sort,
      });

      if (search) {
        params.set("search", search);
      }

      const response = await fetch(`/api/admin/events/major?${params.toString()}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as EventsMajorResponse;
      if (!response.ok) {
        throw new Error(data.error || "Failed to load events");
      }

      const nextEvents = Array.isArray(data.events) ? data.events : [];
      setEvents(
        nextEvents.map((event) => ({
          ...event,
          visibility: event.visibility === "vip_only" ? "vip_only" : "public",
          is_major: event.is_major === true,
        }))
      );

      const apiPagination = data.pagination;
      const total = apiPagination?.total ?? nextEvents.length;
      const totalPages =
        apiPagination?.totalPages ?? (total === 0 ? 0 : Math.ceil(total / Math.max(1, limit)));
      const nextPagination: PaginationState = {
        page: apiPagination?.page ?? page,
        limit: apiPagination?.limit ?? limit,
        total,
        totalPages,
        hasNextPage:
          apiPagination?.hasNextPage ??
          (totalPages > 0 && (apiPagination?.page ?? page) < totalPages),
        hasPrevPage: apiPagination?.hasPrevPage ?? (apiPagination?.page ?? page) > 1,
      };

      setPagination(nextPagination);
      setSelectedIds(new Set());

      if (nextPagination.totalPages > 0 && nextPagination.page > nextPagination.totalPages) {
        setPage(nextPagination.totalPages);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load events");
    } finally {
      setIsLoadingEvents(false);
    }
  }, [limit, page, period, search, sort, user?.is_admin, visibility]);

  useEffect(() => {
    if (user?.is_admin) {
      fetchEvents();
    }
  }, [fetchEvents, user?.is_admin]);

  const majorEvents = useMemo(
    () => events.filter((event) => event.is_major === true),
    [events]
  );
  const nonMajorEvents = useMemo(
    () => events.filter((event) => event.is_major !== true),
    [events]
  );

  const isAllSelectedOnPage = events.length > 0 && events.every((event) => selectedIds.has(event.id));
  const selectedCount = useMemo(
    () => events.filter((event) => selectedIds.has(event.id)).length,
    [events, selectedIds]
  );
  const hasSelected = selectedCount > 0;

  const handleSelectAllOnPage = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(events.map((event) => event.id)));
  };

  const handleSelectOne = (eventId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(eventId);
      } else {
        next.delete(eventId);
      }
      return next;
    });
  };

  const handleToggleMajor = async (eventId: string, nextValue: boolean) => {
    if (isBulkUpdating || updatingIds.has(eventId)) {
      return;
    }

    const snapshot = events;
    setMessage(null);
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(eventId);
      return next;
    });
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, is_major: nextValue } : event
      )
    );

    try {
      const response = await fetch(`/api/admin/events/${eventId}/major`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_major: nextValue }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to update event");
      }

      setMessage({
        type: "success",
        text: nextValue ? "Event marked as major." : "Event removed from major.",
      });
    } catch (error) {
      setEvents(snapshot);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update event",
      });
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  const handleBulkUpdate = async (nextValue: boolean) => {
    if (isBulkUpdating || selectedIds.size === 0) {
      return;
    }

    const ids = events.filter((event) => selectedIds.has(event.id)).map((event) => event.id);
    if (ids.length === 0) {
      return;
    }

    const selectedSet = new Set(ids);
    const snapshot = events;
    setMessage(null);
    setIsBulkUpdating(true);

    setEvents((prev) =>
      prev.map((event) =>
        selectedSet.has(event.id) ? { ...event, is_major: nextValue } : event
      )
    );

    try {
      const response = await fetch("/api/admin/events/major/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, is_major: nextValue }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        updated?: number;
        events?: Array<{ id: string; is_major: boolean }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Bulk update failed");
      }

      if (Array.isArray(data.events)) {
        const statusById = new Map(
          data.events
            .filter((event) => typeof event.id === "string")
            .map((event) => [event.id, event.is_major === true] as const)
        );
        setEvents((prev) =>
          prev.map((event) =>
            statusById.has(event.id)
              ? { ...event, is_major: statusById.get(event.id) === true }
              : event
          )
        );
      }

      const updatedCount = typeof data.updated === "number" ? data.updated : ids.length;
      setMessage({
        type: "success",
        text: `Updated ${updatedCount} event${updatedCount === 1 ? "" : "s"}.`,
      });
      setSelectedIds(new Set());
    } catch (error) {
      setEvents(snapshot);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Bulk update failed",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  if (authLoading) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen bg-[var(--color-background)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
        </main>
        <Footer />
      </>
    );
  }

  if (!user?.is_admin) {
    return null;
  }

  const renderEventsSection = (title: string, sectionEvents: MajorAdminEvent[]) => (
    <section className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <span className="text-xs text-[var(--color-text-muted)]">
          {sectionEvents.length} on this page
        </span>
      </div>

      {isLoadingEvents ? (
        <EventListSkeleton />
      ) : sectionEvents.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No events found.</p>
      ) : (
        <ul className="space-y-3">
          {sectionEvents.map((event) => {
            const isUpdating = updatingIds.has(event.id);
            const isSelected = selectedIds.has(event.id);

            return (
              <li
                key={event.id}
                className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-background)] p-4"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isBulkUpdating || isUpdating}
                    onChange={(inputEvent) =>
                      handleSelectOne(event.id, inputEvent.target.checked)
                    }
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-[var(--color-surface-border)]"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                      {event.name || "(no name)"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {event.city || "Unknown city"}
                      {event.country ? `, ${event.country}` : ""}
                      {" · "}
                      {formatEventDate(event.start_date)}
                      {" · "}
                      {event.visibility === "vip_only" ? "VIP only" : "Public"}
                    </p>
                    {event.slug ? (
                      <Link
                        href={`/events/${event.slug}`}
                        className="mt-1 inline-block truncate text-xs text-[var(--color-primary)] hover:underline"
                      >
                        /events/{event.slug}
                      </Link>
                    ) : (
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{event.id}</p>
                    )}
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Status: {event.is_major ? "Major" : "Non-major"}
                    </p>
                  </div>

                  <Button
                    variant={event.is_major ? "outline" : "primary"}
                    size="sm"
                    disabled={isBulkUpdating || isUpdating}
                    onClick={() => handleToggleMajor(event.id, !event.is_major)}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : event.is_major ? (
                      "Unset major"
                    ) : (
                      "Set major"
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--color-background)] pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-7xl">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
                  <Star className="h-6 w-6" />
                  Events Major Manager
                </h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Manage the is_major flag for upcoming and archived events without changing showcase logic.
                </p>
              </div>
              <Button
                variant="outline"
                disabled={isLoadingEvents || isBulkUpdating}
                onClick={fetchEvents}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search name, slug, city, country"
                  icon={<Search className="h-4 w-4" />}
                />

                <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                  Visibility
                  <select
                    className="h-10 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 text-sm text-[var(--color-text-primary)]"
                    value={visibility}
                    onChange={(event) => {
                      setVisibility(event.target.value as VisibilityFilter);
                      setPage(1);
                    }}
                  >
                    <option value="all">All</option>
                    <option value="public">Public</option>
                    <option value="vip_only">VIP only</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                  Period
                  <select
                    className="h-10 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 text-sm text-[var(--color-text-primary)]"
                    value={period}
                    onChange={(event) => {
                      setPeriod(event.target.value as PeriodFilter);
                      setPage(1);
                    }}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="all">All</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                  Sort by start date
                  <select
                    className="h-10 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 text-sm text-[var(--color-text-primary)]"
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value as SortDirection);
                      setPage(1);
                    }}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                  Per page
                  <select
                    className="h-10 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 text-sm text-[var(--color-text-primary)]"
                    value={String(limit)}
                    onChange={(event) => {
                      setLimit(Number(event.target.value) || 50);
                      setPage(1);
                    }}
                  >
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="150">150</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--color-surface-border)] pt-4">
                <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                  <input
                    type="checkbox"
                    checked={isAllSelectedOnPage}
                    disabled={isLoadingEvents || isBulkUpdating || events.length === 0}
                    onChange={(event) => handleSelectAllOnPage(event.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-[var(--color-surface-border)]"
                  />
                  Select all on page
                </label>

                <span className="text-sm text-[var(--color-text-secondary)]">
                  Selected: {selectedCount}
                </span>

                <Button
                  size="sm"
                  disabled={!hasSelected || isBulkUpdating}
                  onClick={() => handleBulkUpdate(true)}
                >
                  {isBulkUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Mark as major"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasSelected || isBulkUpdating}
                  onClick={() => handleBulkUpdate(false)}
                >
                  {isBulkUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Remove from major"
                  )}
                </Button>
              </div>

              {message && (
                <p
                  className={`mt-4 text-sm ${
                    message.type === "error"
                      ? "text-[var(--color-error)]"
                      : "text-[var(--color-success)]"
                  }`}
                >
                  {message.text}
                </p>
              )}
              {loadError && <p className="mt-2 text-sm text-[var(--color-error)]">{loadError}</p>}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {renderEventsSection("Major events", majorEvents)}
              {renderEventsSection("Non-major events", nonMajorEvents)}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Page {pagination.page}
                {pagination.totalPages > 0 ? ` of ${pagination.totalPages}` : ""}
                {" · "}
                Total events: {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevPage || isLoadingEvents}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage || isLoadingEvents}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
