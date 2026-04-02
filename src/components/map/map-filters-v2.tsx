"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";

import type { ContentTypeFilter, Interest, MapFilters, UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { getInterests } from "@/lib/api/interests";
import { INTEREST_DEFINITIONS, USER_ROLE_OPTIONS } from "@/lib/profile-taxonomy";

import countries from "../../../supabase/coutries";

import { MapFilterMultiSelect } from "./map-filter-multi-select";
import { MapFilterSelect } from "./map-filter-select";

type MapV2FiltersProps = {
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  isAuthenticated: boolean;
};

const kodeMonoStyle = {
  fontFamily: "var(--font-kode-mono), monospace",
} as const;

const roleOptions: { value: UserRole; label: string }[] = USER_ROLE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label.toLowerCase(),
}));

const mapContentSelectOptions: { value: ContentTypeFilter; label: string }[] = [
  { value: "all", label: "everything on map" },
  { value: "users", label: "users only" },
  { value: "events", label: "events only" },
];

function countryCodeToFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export const MAP_V2_DEFAULT_FILTERS: MapFilters = {
  showUsers: true,
  showEvents: true,
  showHubs: false,
  showCommunities: false,
  showWorkspaces: false,
  contentType: "all",
  interestSlugs: undefined,
  userRoles: undefined,
  bestMatches: undefined,
  completeProfiles: undefined,
  // Legacy filters stay undefined in v2 unless explicitly used elsewhere.
  activeOnly: undefined,
  openToMeet: undefined,
  country: undefined,
  countryCode: undefined,
};

function buildContentTypePayload(contentType: ContentTypeFilter): Partial<MapFilters> {
  if (contentType === "users") {
    return {
      contentType,
      showUsers: true,
      showEvents: false,
      showHubs: false,
      showCommunities: false,
      showWorkspaces: false,
    };
  }

  if (contentType === "events") {
    return {
      contentType,
      showUsers: false,
      showEvents: true,
      showHubs: false,
      showCommunities: false,
      showWorkspaces: false,
    };
  }

  return {
    contentType: "all",
    showUsers: true,
    showEvents: true,
    showHubs: false,
    showCommunities: false,
    showWorkspaces: false,
  };
}

function FieldLabel({ children }: { children: string }) {
  return (
    <label
      className="mb-[12px] block text-[15px] font-normal leading-none tracking-normal text-white/90"
      style={kodeMonoStyle}
    >
      {children}
    </label>
  );
}

function prefersCoarseOrNoHover(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(hover: none)").matches || window.matchMedia("(pointer: coarse)").matches
  );
}

function AdditionalFiltersHeading() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tipVisible, setTipVisible] = useState(false);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipId = "map-v2-additional-filters-tooltip";

  const isFinePointerHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const clearHoverLeaveTimer = () => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!tipVisible) return;
    if (!prefersCoarseOrNoHover()) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const node = e.target;
      if (!(node instanceof Node)) return;
      if (rootRef.current?.contains(node)) return;
      setTipVisible(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [tipVisible]);

  return (
    <div ref={rootRef} className="relative mb-[12px] inline-flex max-w-full flex-wrap items-center gap-1">
      <p
        className="text-[15px] font-normal leading-none tracking-normal text-white/90"
        style={kodeMonoStyle}
      >
        additional filters
      </p>
      <button
        type="button"
        aria-label="About additional filters"
        aria-expanded={tipVisible}
        aria-controls={tipId}
        className="inline-flex shrink-0 rounded p-0.5 text-white/60 transition-colors hover:text-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14f195]/80"
        onMouseEnter={() => {
          if (!isFinePointerHover()) return;
          clearHoverLeaveTimer();
          setTipVisible(true);
        }}
        onMouseLeave={() => {
          if (!isFinePointerHover()) return;
          clearHoverLeaveTimer();
          hoverLeaveTimerRef.current = setTimeout(() => setTipVisible(false), 140);
        }}
        onFocus={() => {
          if (!prefersCoarseOrNoHover()) setTipVisible(true);
        }}
        onBlur={() => {
          if (prefersCoarseOrNoHover()) return;
          clearHoverLeaveTimer();
          hoverLeaveTimerRef.current = setTimeout(() => setTipVisible(false), 120);
        }}
        onClick={() => {
          if (prefersCoarseOrNoHover()) setTipVisible((v) => !v);
        }}
      >
        <CircleHelp className="h-3.5 w-3.5" aria-hidden />
      </button>
      {tipVisible ? (
        <div
          id={tipId}
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-[min(300px,calc(100vw-2rem))] border border-[#2A2A2A] bg-[#0f1216] px-3 py-2 text-left text-[11px] font-normal leading-snug tracking-normal text-white/90 shadow-lg sm:left-1/2 sm:-translate-x-1/2"
          style={kodeMonoStyle}
        >
          <p className="mb-2 text-white/90">
            <span className="font-bold text-white">Best matches:</span> Shows people with the highest overlap in interests, roles, and shared events. More overlap in interests, skills, and events → stronger match.
          </p>
          <p className="mb-0 text-white/90">
            <span className="font-bold text-white">Complete profiles:</span> Shows users with filled profiles: About, country, skills, at least one interest, role, and experience.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function MapFiltersPanelV2({ filters, onFiltersChange, isAuthenticated }: MapV2FiltersProps) {
  const [interestDictionary, setInterestDictionary] = useState<Interest[]>([]);

  useEffect(() => {
    let cancelled = false;
    getInterests()
      .then((items) => {
        if (!cancelled) setInterestDictionary(items);
      })
      .catch(() => {
        /* fallback to INTEREST_DEFINITIONS */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const countrySelectOptions = useMemo(
    () =>
      countries.map((c) => ({
        value: c.code,
        label: c.name,
        icon: countryCodeToFlagEmoji(c.code),
      })),
    []
  );

  const interestFilterOptions = useMemo(() => {
    const source =
      interestDictionary.length > 0
        ? interestDictionary
        : INTEREST_DEFINITIONS.map((i) => ({
            id: i.slug,
            slug: i.slug,
            name: i.name,
          }));
    return source.map((i) => ({ value: i.slug, label: i.name }));
  }, [interestDictionary]);

  const selectedCountryCode = filters.countryCode ?? "";
  const selectedMapContent: ContentTypeFilter = filters.contentType ?? "all";

  const onReset = () => {
    onFiltersChange({
      ...MAP_V2_DEFAULT_FILTERS,
    });
  };

  const onCountryChange = (nextCode: string) => {
    if (!nextCode) {
      onFiltersChange({
        ...filters,
        country: undefined,
        countryCode: undefined,
      });
      return;
    }

    const selectedCountry = countries.find((country) => country.code === nextCode);
    if (!selectedCountry) return;

    onFiltersChange({
      ...filters,
      country: selectedCountry.name,
      countryCode: selectedCountry.code,
    });
  };

  const onMapContentChange = (contentType: string) => {
    onFiltersChange({
      ...filters,
      ...buildContentTypePayload(contentType as ContentTypeFilter),
    });
  };

  return (
    <aside className="overflow-visible border border-[#2A2A2A] bg-[#171A1E]">
      <div className="flex items-center justify-between border-b border-[#2A2A2A] px-4 py-3.5">
        <h2 className="text-[20px] font-bold leading-none tracking-[0] text-white" style={kodeMonoStyle}>
          Filters
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="text-[15px] font-normal leading-none tracking-normal text-white/70 underline-offset-2 hover:text-white hover:underline"
          style={kodeMonoStyle}
        >
          reset
        </button>
      </div>

      <div className="px-4 pb-4 pt-[23px]">
        <div>
          <FieldLabel>user&apos;s role</FieldLabel>
          <MapFilterMultiSelect
            className="mb-[20px]"
            values={filters.userRoles ?? []}
            onChange={(roles) =>
              onFiltersChange({
                ...filters,
                userRoles: roles.length > 0 ? (roles as UserRole[]) : undefined,
              })
            }
            options={roleOptions}
            placeholder="choose roles"
            searchPlaceholder="find roles"
          />
        </div>

        <div>
          <FieldLabel>country</FieldLabel>
          <MapFilterSelect
            className="mb-[20px]"
            value={selectedCountryCode}
            onChange={onCountryChange}
            options={countrySelectOptions}
            placeholder="choose country"
            searchable
            searchPlaceholder="find your country"
          />
        </div>

        <div>
          <FieldLabel>map content</FieldLabel>
          <MapFilterSelect
            className="mb-[20px]"
            value={selectedMapContent}
            onChange={onMapContentChange}
            options={mapContentSelectOptions}
            placeholder="everything on map"
          />
        </div>

        <div>
          <FieldLabel>user&apos;s interests</FieldLabel>
          <MapFilterMultiSelect
            className="mb-[20px]"
            values={filters.interestSlugs ?? []}
            onChange={(interestSlugs) =>
              onFiltersChange({
                ...filters,
                interestSlugs: interestSlugs.length > 0 ? interestSlugs : undefined,
              })
            }
            options={interestFilterOptions}
            placeholder="choose interests"
            searchPlaceholder="find interests"
          />
        </div>

        <div>
          <AdditionalFiltersHeading />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, bestMatches: !filters.bestMatches })}
              disabled={!isAuthenticated}
              className={cn(
                "h-9 w-[109px] border px-0 text-center text-[12px] font-bold leading-none tracking-[0] transition-colors",
                filters.bestMatches
                  ? "border-[#14f195] bg-[#0A201A] text-[#14f195]"
                  : "border-[#555] text-white hover:border-white/80",
                !isAuthenticated && "cursor-not-allowed opacity-50 hover:border-[#555]"
              )}
              style={kodeMonoStyle}
              title={!isAuthenticated ? "Sign in to use Best matches." : undefined}
            >
              Best matches
            </button>
            <button
              type="button"
              onClick={() =>
                onFiltersChange({ ...filters, completeProfiles: !filters.completeProfiles })
              }
              className={cn(
                "h-9 w-[141px] border px-0 text-center text-[12px] font-bold leading-none tracking-[0] transition-colors",
                filters.completeProfiles
                  ? "border-[#14f195] bg-[#0A201A] text-[#14f195]"
                  : "border-[#555] text-white hover:border-white/80"
              )}
              style={kodeMonoStyle}
            >
              Complete profiles
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
