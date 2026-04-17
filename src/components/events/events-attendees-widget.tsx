"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, Search, SlidersHorizontal, User, X } from "lucide-react";

import { Avatar, Button } from "@/components/ui";
import { getInterests } from "@/lib/api/interests";
import {
  INTEREST_DEFINITIONS,
  USER_ROLE_LABELS,
  USER_ROLE_OPTIONS,
} from "@/lib/profile-taxonomy";
import { cn } from "@/lib/utils";
import type { AttendeeFilterState, Interest, UserRole } from "@/types";

import countries from "../../../supabase/coutries";

type AttendeeItem = {
  id: string;
  avatar_url: string | null;
  name: string;
  twitter_handle: string | null;
  isVip: boolean;
  isVerified: boolean;
  role: UserRole | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  about: string | null;
  interests: Interest[];
  is_complete_profile: boolean;
  match_score: number;
  interest_overlap_count: number;
  skill_overlap_count: number;
  shared_events_count: number;
  registered_at: string;
};

type AttendeesApiResponse = {
  items: AttendeeItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  /** Internal "going" members before role/country/interest filters */
  total_registered?: number;
  error?: string;
};

type MultiSelectOption = {
  value: string;
  label: string;
};

type MultiSelectPopupProps = {
  label: string;
  placeholder: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
};

type SingleSelectPopupProps = {
  label: string;
  placeholder: string;
  options: MultiSelectOption[];
  value?: string;
  onChange: (value?: string) => void;
  /** When false, hide the label-row clear control (e.g. country: use "All" in the list). */
  showClear?: boolean;
};

const kodeMonoStyle = {
  fontFamily: "var(--font-kode-mono), monospace",
} as const;

const interStyle = {
  fontFamily: "var(--font-inter), system-ui, sans-serif",
} as const;

const spaceGroteskStyle = {
  fontFamily: "var(--font-display), system-ui, sans-serif",
} as const;

const attendeeCardFill = "#0B0B0B";

/**
 * Linear border gradient: bright mint at the anchored edge, fades smoothly
 * along the opposite direction. Corners no longer form a visible silhouette
 * because the card fill, the fade overlay end color, and the surrounding
 * section all share the same #0B0B0B hex.
 */
const mintLinearBorder = (angleDeg: number) =>
  `linear-gradient(${angleDeg}deg,` +
  " #00F68B 0%," +
  " rgba(0, 246, 139, 0.85) 25%," +
  " rgba(0, 246, 139, 0.45) 55%," +
  " rgba(0, 246, 139, 0.12) 75%," +
  " rgba(0, 246, 139, 0) 92%)";

/** Row-1 cards: mint border starts at the top, fades out toward the bottom. */
const attendeeCardSurfaceStyle = {
  border: "1px solid transparent",
  background: `
    linear-gradient(${attendeeCardFill}, ${attendeeCardFill}) padding-box,
    ${mintLinearBorder(180)} border-box
  `,
  backgroundClip: "padding-box, border-box",
} as const;

/** Row-2 cards: mint border starts at the bottom, fades out toward the top. */
const attendeeCardSurfaceStyleFlipped = {
  border: "1px solid transparent",
  background: `
    linear-gradient(${attendeeCardFill}, ${attendeeCardFill}) padding-box,
    ${mintLinearBorder(0)} border-box
  `,
  backgroundClip: "padding-box, border-box",
} as const;

/**
 * Tiny fade only on the very last ~10% of the card, matching the page
 * background. Prevents the corners where the mint border ends from looking
 * like a hard rectangle, without darkening actual content.
 */
const attendeeCardBottomFadeClass =
  "pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,transparent_0%,transparent_85%,#0B0B0B_100%)]";

const attendeeCardTopFadeClass =
  "pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(0deg,transparent_0%,transparent_85%,#0B0B0B_100%)]";

/** Soft mint glow above the card only — replaces the all-around shadow so bottom corners melt into the page. */
const attendeeCardTopGlowStyle = {
  background:
    "radial-gradient(60% 100% at 50% 0%, rgba(0,246,139,0.22) 0%, rgba(0,246,139,0.08) 45%, transparent 75%)",
  filter: "blur(6px)",
} as const;

const attendeeCardTopGlowClass =
  "pointer-events-none absolute -top-4 left-1/2 h-24 w-[calc(100%+32px)] -translate-x-1/2";

/** Soft mint glow below the card — for flipped (row-2) cards. */
const attendeeCardBottomGlowStyle = {
  background:
    "radial-gradient(60% 100% at 50% 100%, rgba(0,246,139,0.22) 0%, rgba(0,246,139,0.08) 45%, transparent 75%)",
  filter: "blur(6px)",
} as const;

const attendeeCardBottomGlowClass =
  "pointer-events-none absolute -bottom-4 left-1/2 h-24 w-[calc(100%+32px)] -translate-x-1/2";

function MultiSelectPopup({
  label,
  placeholder,
  options,
  values,
  onChange,
}: MultiSelectPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  const valueSet = useMemo(() => new Set(values), [values]);

  const displayText = useMemo(() => {
    if (values.length === 0) return placeholder;
    const selectedLabels = options
      .filter((option) => valueSet.has(option.value))
      .map((option) => option.label);

    if (selectedLabels.length === 0) return placeholder;
    if (selectedLabels.length === 1) return selectedLabels[0];
    return `${selectedLabels[0]} +${selectedLabels.length - 1}`;
  }, [options, placeholder, valueSet, values.length]);

  const toggleOption = (value: string) => {
    if (valueSet.has(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    onChange([...values, value]);
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-2 block text-[12px] text-white/80" style={kodeMonoStyle}>
        {label}
      </label>
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between border border-[#2A2A2A] bg-[#0E0F11] px-3 text-left text-[13px] font-semibold text-white"
        style={kodeMonoStyle}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={cn("truncate", values.length === 0 && "text-white/60")}>{displayText}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-white/70 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 border border-[#2A2A2A] bg-[#0E0F11] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <div className="mb-2 flex h-9 items-center gap-2 border border-[#2A2A2A] bg-black px-2">
            <Search className="h-3.5 w-3.5 text-white/55" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`find ${label.toLowerCase()}`}
              className="w-full bg-transparent text-[12px] text-white placeholder:text-white/45 focus:outline-none"
              style={kodeMonoStyle}
            />
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            <button
              type="button"
              className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[12px] font-semibold text-white hover:bg-white/5"
              style={kodeMonoStyle}
              onClick={() => onChange([])}
            >
              <span>All</span>
              <span className={cn("h-3.5 w-3.5 border", values.length === 0 ? "border-white bg-white" : "border-white/30")} />
            </button>

            {filteredOptions.map((option) => {
              const checked = valueSet.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[12px] text-white hover:bg-white/5"
                  style={kodeMonoStyle}
                  onClick={() => toggleOption(option.value)}
                >
                  <span>{option.label}</span>
                  <span className={cn("h-3.5 w-3.5 border", checked ? "border-white bg-white" : "border-white/30")} />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SingleSelectPopup({
  label,
  placeholder,
  options,
  value,
  onChange,
  showClear = true,
}: SingleSelectPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabel = useMemo(() => {
    if (!value) return placeholder;
    const selected = options.find((option) => option.value === value);
    return selected?.label || placeholder;
  }, [options, placeholder, value]);

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-[12px] text-white/80" style={kodeMonoStyle}>
          {label}
        </label>
        {showClear ? (
          <button
            type="button"
            className={cn(
              "text-[11px] transition-colors",
              value ? "text-white/70 hover:text-white" : "cursor-default text-white/35"
            )}
            style={kodeMonoStyle}
            onClick={() => {
              if (!value) return;
              onChange(undefined);
              setQuery("");
            }}
            disabled={!value}
          >
            clear
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between border border-[#2A2A2A] bg-[#0E0F11] px-3 text-left text-[13px] font-semibold text-white"
        style={kodeMonoStyle}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={cn("truncate", !value && "text-white/60")}>{selectedLabel}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-white/70 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 border border-[#2A2A2A] bg-[#0E0F11] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <div className="mb-2 flex h-9 items-center gap-2 border border-[#2A2A2A] bg-black px-2">
            <Search className="h-3.5 w-3.5 text-white/55" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`find ${label.toLowerCase()}`}
              className="w-full bg-transparent text-[12px] text-white placeholder:text-white/45 focus:outline-none"
              style={kodeMonoStyle}
            />
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            <button
              type="button"
              className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[12px] font-semibold text-white hover:bg-white/5"
              style={kodeMonoStyle}
              onClick={() => {
                onChange(undefined);
                setIsOpen(false);
              }}
            >
              <span>All</span>
              <span className={cn("h-3.5 w-3.5 border", !value ? "border-white bg-white" : "border-white/30")} />
            </button>

            {filteredOptions.map((option) => {
              const checked = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[12px] text-white hover:bg-white/5"
                  style={kodeMonoStyle}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  <span className={cn("h-3.5 w-3.5 border", checked ? "border-white bg-white" : "border-white/30")} />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface EventsAttendeesWidgetProps {
  selectedEventId: string;
  selectedEventName: string;
  filters: AttendeeFilterState;
  isAuthenticated: boolean;
  onFiltersChange: (patch: Partial<AttendeeFilterState>, resetPage?: boolean) => void;
  onRequireAuth: () => void;
  onClose: () => void;
}

export function EventsAttendeesWidget({
  selectedEventId,
  selectedEventName,
  filters,
  isAuthenticated,
  onFiltersChange,
  onRequireAuth,
  onClose,
}: EventsAttendeesWidgetProps) {
  const [items, setItems] = useState<AttendeeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRegistered, setTotalRegistered] = useState<number | undefined>(undefined);
  const [listRefresh, setListRefresh] = useState(0);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [interests, setInterests] = useState<Interest[]>(
    INTEREST_DEFINITIONS.map((interest) => ({
      id: interest.slug,
      slug: interest.slug,
      name: interest.name,
    }))
  );

  useEffect(() => {
    let cancelled = false;

    const loadInterests = async () => {
      try {
        const loaded = await getInterests();
        if (!cancelled && loaded.length > 0) {
          setInterests(loaded);
        }
      } catch (interestError) {
        console.error("Failed to load interests dictionary:", interestError);
      }
    };

    loadInterests();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAttendees = async () => {
      if (!selectedEventId) {
        setItems([]);
        setTotal(0);
        setTotalPages(0);
        setTotalRegistered(undefined);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams();
        if (filters.roles.length > 0) {
          query.set("roles", filters.roles.join(","));
        }
        if (filters.countryCode) {
          query.set("country_code", filters.countryCode);
        }
        if (filters.interestSlugs.length > 0) {
          query.set("interest_slugs", filters.interestSlugs.join(","));
        }
        if (filters.bestMatches) {
          query.set("best_matches", "true");
        }
        if (filters.completeProfiles) {
          query.set("complete_profiles", "true");
        }
        query.set("page", String(filters.page || 1));
        query.set("page_size", String(filters.pageSize || 4));

        const response = await fetch(`/api/events/${selectedEventId}/attendees?${query.toString()}`, {
          cache: "no-store",
        });

        const data = (await response.json().catch(() => ({}))) as AttendeesApiResponse;

        if (response.status === 401) {
          if (!cancelled) {
            setItems([]);
            setTotal(0);
            setTotalPages(0);
            setTotalRegistered(undefined);
            setError("Sign in to view attendees.");
          }
          onRequireAuth();
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || "Failed to load attendees");
        }

        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setTotal(typeof data.total === "number" ? data.total : 0);
          setTotalPages(typeof data.total_pages === "number" ? data.total_pages : 0);
          setTotalRegistered(
            typeof data.total_registered === "number" ? data.total_registered : undefined
          );
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load attendees");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAttendees();

    return () => {
      cancelled = true;
    };
  }, [
    selectedEventId,
    filters.roles,
    filters.countryCode,
    filters.interestSlugs,
    filters.bestMatches,
    filters.completeProfiles,
    filters.page,
    filters.pageSize,
    listRefresh,
    onRequireAuth,
  ]);

  const roleOptions = USER_ROLE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  const interestOptions = interests.map((interest) => ({
    value: interest.slug,
    label: interest.name,
  }));

  const countryOptions = countries.map((country) => ({
    code: country.code,
    name: country.name,
  }));

  const onView = useCallback(
    (twitterHandle: string | null) => {
      if (!isAuthenticated) {
        onRequireAuth();
        return;
      }
      if (!twitterHandle) return;
      window.location.href = `/profile/${twitterHandle}`;
    },
    [isAuthenticated, onRequireAuth]
  );

  const handleBeFirstAttendee = useCallback(async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (!selectedEventId || joinSubmitting) return;

    setJoinSubmitting(true);
    setJoinError(null);

    try {
      const response = await fetch(`/api/events/${selectedEventId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "going" }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (response.status === 401) {
        onRequireAuth();
        return;
      }

      if (!response.ok) {
        const message = payload.error || "Failed to register for event";
        if (message.toLowerCase().includes("already registered")) {
          setListRefresh((n) => n + 1);
          return;
        }
        setJoinError(message);
        return;
      }

      setListRefresh((n) => n + 1);
    } catch (joinRequestError) {
      setJoinError(
        joinRequestError instanceof Error ? joinRequestError.message : "Failed to register for event"
      );
    } finally {
      setJoinSubmitting(false);
    }
  }, [isAuthenticated, joinSubmitting, onRequireAuth, selectedEventId]);

  const canGoPrev = filters.page > 1;
  const canGoNext = totalPages > 0 && filters.page < totalPages;

  const resetFilters = () => {
    onFiltersChange(
      {
        roles: [],
        countryCode: undefined,
        interestSlugs: [],
        bestMatches: false,
        completeProfiles: false,
      },
      true
    );
  };

  return (
    <section className="relative rounded-[6px] border border-white/15 bg-[#0B0B0B] p-4 sm:p-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 rounded border border-white/25 p-1 text-white/70 transition-colors hover:border-white/60 hover:text-white"
        aria-label="Close attendees list"
      >
        <X className="h-4 w-4" />
      </button>
      <h3
        className="text-center text-[30px] font-semibold text-white"
        style={{ fontFamily: "var(--font-kode-mono), monospace" }}
      >
        Attendees
      </h3>
      <p className="mt-2 text-center text-[13px] text-white/70" style={kodeMonoStyle}>
        See who&apos;s going to <span className="text-white">{selectedEventName}</span>
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="w-full border border-[#2A2A2A] bg-[#171A1E] p-3 lg:h-[401px] lg:w-[300px]">
          <div className="mb-3 flex items-center justify-between border-b border-[#2A2A2A] pb-2">
            <p className="text-[16px] font-bold text-white" style={kodeMonoStyle}>
              Filters
            </p>
            <button
              type="button"
              className="text-[12px] text-white/70 hover:text-white"
              style={kodeMonoStyle}
              onClick={resetFilters}
            >
              reset
            </button>
          </div>

          <div className="space-y-3">
            <MultiSelectPopup
              label="user's role"
              placeholder="choose role"
              options={roleOptions}
              values={filters.roles}
              onChange={(roles) => onFiltersChange({ roles: roles as UserRole[] }, true)}
            />

            <SingleSelectPopup
              label="country"
              placeholder="choose country"
              showClear={false}
              options={countryOptions.map((country) => ({
                value: country.code,
                label: country.name,
              }))}
              value={filters.countryCode}
              onChange={(countryCode) =>
                onFiltersChange(
                  {
                    countryCode,
                  },
                  true
                )
              }
            />

            <MultiSelectPopup
              label="user's interests"
              placeholder="choose interests"
              options={interestOptions}
              values={filters.interestSlugs}
              onChange={(interestSlugs) => onFiltersChange({ interestSlugs }, true)}
            />

            <div>
              <p className="mb-2 flex items-center gap-1 text-[12px] text-white/80" style={kodeMonoStyle}>
                additional filters
                <SlidersHorizontal className="h-3 w-3" />
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(
                    "h-8 border px-2.5 text-[11px] font-bold",
                    filters.bestMatches
                      ? "border-[#14f195] bg-[#0A201A] text-[#14f195]"
                      : "border-[#555] text-white hover:border-white/80"
                  )}
                  style={kodeMonoStyle}
                  onClick={() => onFiltersChange({ bestMatches: !filters.bestMatches }, true)}
                >
                  Best matches
                </button>
                <button
                  type="button"
                  className={cn(
                    "h-8 border px-2.5 text-[11px] font-bold",
                    filters.completeProfiles
                      ? "border-[#14f195] bg-[#0A201A] text-[#14f195]"
                      : "border-[#555] text-white hover:border-white/80"
                  )}
                  style={kodeMonoStyle}
                  onClick={() =>
                    onFiltersChange({ completeProfiles: !filters.completeProfiles }, true)
                  }
                >
                  Complete profiles
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => {
                const flipped = index >= 2;
                return (
                  <div
                    key={index}
                    className="relative isolate h-[420px] w-full max-w-[256px] sm:h-[374px]"
                  >
                    <div
                      aria-hidden
                      className={flipped ? attendeeCardBottomGlowClass : attendeeCardTopGlowClass}
                      style={flipped ? attendeeCardBottomGlowStyle : attendeeCardTopGlowStyle}
                    />
                    <div
                      className="relative z-1 h-full w-full animate-pulse overflow-hidden rounded-[3px]"
                      style={flipped ? attendeeCardSurfaceStyleFlipped : attendeeCardSurfaceStyle}
                    >
                      <div className={cn(flipped ? attendeeCardTopFadeClass : attendeeCardBottomFadeClass)} aria-hidden />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : error ? (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" style={kodeMonoStyle}>
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded border border-white/15 bg-white/5 px-4 py-5 text-sm text-white/70" style={kodeMonoStyle}>
              {totalRegistered === 0 ? (
                <div className="space-y-2">
                  <p className="text-white/80">no attendees found</p>
                  <p>
                    <button
                      type="button"
                      disabled={joinSubmitting}
                      onClick={handleBeFirstAttendee}
                      className={cn(
                        "text-white underline decoration-white underline-offset-4 transition-colors",
                        joinSubmitting
                          ? "cursor-wait text-white/50"
                          : "hover:text-[#14f195] hover:decoration-[#14f195]"
                      )}
                    >
                      {joinSubmitting ? "Joining…" : "be the first attendee"}
                    </button>
                  </p>
                  {joinError ? (
                    <p className="text-[12px] text-red-300" role="alert">
                      {joinError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p>No attendees found for selected filters.</p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 sm:items-stretch">
                {items.map((item, index) => {
                  const flipped = index >= 2;
                  const location =
                    [item.city, item.country].filter(Boolean).join(", ") || "Location unknown";
                  const about = item.about || "Profile has no about yet.";
                  const roleLabel = item.role
                    ? USER_ROLE_LABELS[item.role] || item.role
                    : "Role not specified";
                  return (
                    <article
                      key={item.id}
                      className="relative isolate flex h-full w-full max-w-[256px] min-h-[420px] flex-col sm:mx-auto sm:min-h-[374px]"
                    >
                      <div
                        aria-hidden
                        className={flipped ? attendeeCardBottomGlowClass : attendeeCardTopGlowClass}
                        style={flipped ? attendeeCardBottomGlowStyle : attendeeCardTopGlowStyle}
                      />
                      <div
                        className="relative z-1 flex h-full w-full flex-1 flex-col overflow-hidden rounded-[3px] p-4 sm:p-[14px]"
                        style={flipped ? attendeeCardSurfaceStyleFlipped : attendeeCardSurfaceStyle}
                      >
                      <div className={cn(flipped ? attendeeCardTopFadeClass : attendeeCardBottomFadeClass)} aria-hidden />
                      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                        <div className="flex flex-col items-center">
                          <div className="rounded-full bg-[#E8F5ED] p-[3px]">
                            <Avatar
                              src={item.avatar_url || undefined}
                              alt={item.name}
                              size="card"
                              fallbackVariant="branded"
                              isVip={item.isVip}
                              isVerified={item.isVerified}
                            />
                          </div>
                          <h4
                            className="mt-6 max-w-full truncate text-center text-[20px] font-extrabold leading-none tracking-normal text-white sm:mt-[15px]"
                            style={interStyle}
                            title={item.name}
                          >
                            {item.name}
                          </h4>
                        </div>

                        <div className="mt-[33px] w-full min-w-0 space-y-5 text-[15px] font-medium leading-none tracking-normal sm:space-y-[15px]">
                          <p className="flex items-start gap-2 text-[#14f195]" style={kodeMonoStyle}>
                            <User
                              className="mt-px h-[15px] w-[15px] shrink-0"
                              strokeWidth={1.5}
                              aria-hidden
                            />
                            <span className="min-w-0 wrap-break-word">{roleLabel}</span>
                          </p>
                          <p className="flex items-start gap-2 text-[#14f195]" style={kodeMonoStyle}>
                            <MapPin
                              className="mt-px h-[15px] w-[15px] shrink-0"
                              strokeWidth={1.5}
                              aria-hidden
                            />
                            <span className="min-w-0 wrap-break-word">{location}</span>
                          </p>
                        </div>

                        <div className="mt-4 flex min-h-0 flex-col sm:mt-[11px]">
                          <p
                            className="text-center text-[15px] font-medium leading-none tracking-normal text-[#70767d]"
                            style={kodeMonoStyle}
                          >
                            About
                          </p>
                          <p
                            className="mt-3 line-clamp-5 text-left text-[12px] font-medium leading-[normal] tracking-normal text-white sm:mt-[9px]"
                            style={spaceGroteskStyle}
                          >
                            {about}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-auto mx-auto h-[49px] w-[164px] shrink-0 rounded-[7px] border-0 bg-white px-6 py-3 text-[20px] font-bold leading-none tracking-[-0.05em] text-black hover:bg-white/90"
                          style={kodeMonoStyle}
                          onClick={() => onView(item.twitter_handle)}
                          disabled={!item.twitter_handle}
                        >
                          View
                        </Button>
                      </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-3 sm:flex-row">
                <p className="text-[12px] text-white/65" style={kodeMonoStyle}>
                  {total} attendees
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-white/25 text-white hover:bg-white/10"
                    style={kodeMonoStyle}
                    onClick={() => onFiltersChange({ page: Math.max(filters.page - 1, 1) }, false)}
                    disabled={!canGoPrev}
                  >
                    Prev
                  </Button>
                  <span className="text-[12px] text-white/80" style={kodeMonoStyle}>
                    Page {filters.page}
                    {totalPages > 0 ? ` of ${totalPages}` : ""}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-white/25 text-white hover:bg-white/10"
                    style={kodeMonoStyle}
                    onClick={() => onFiltersChange({ page: filters.page + 1 }, false)}
                    disabled={!canGoNext}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
