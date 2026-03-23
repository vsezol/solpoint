"use client";

import { useEffect, useMemo, useState } from "react";
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
  { value: "hubs", label: "hubs & communities" },
];

const roleSelectOptions = [{ value: "", label: "choose role" }, ...roleOptions.map((r) => ({ value: r.value, label: r.label }))];

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
  showHubs: true,
  showCommunities: true,
  showWorkspaces: true,
  contentType: "all",
  interestSlugs: undefined,
  userRoles: undefined,
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

  if (contentType === "hubs") {
    return {
      contentType,
      showUsers: false,
      showEvents: false,
      showHubs: true,
      showCommunities: true,
      showWorkspaces: true,
    };
  }

  return {
    contentType: "all",
    showUsers: true,
    showEvents: true,
    showHubs: true,
    showCommunities: true,
    showWorkspaces: true,
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

export function MapFiltersPanelV2({ filters, onFiltersChange }: MapV2FiltersProps) {
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

  const selectedRole = filters.userRoles?.[0] ?? "";
  const selectedCountryCode = filters.countryCode ?? "";
  const selectedMapContent: ContentTypeFilter = filters.contentType ?? "all";

  const onReset = () => {
    onFiltersChange({
      ...MAP_V2_DEFAULT_FILTERS,
    });
  };

  const onRoleChange = (nextRole: UserRole | "") => {
    onFiltersChange({
      ...filters,
      userRoles: nextRole ? [nextRole] : undefined,
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
          <MapFilterSelect
            className="mb-[20px]"
            value={selectedRole}
            onChange={(v) => onRoleChange(v as UserRole | "")}
            options={roleSelectOptions}
            placeholder="choose role"
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
          <p className="mb-[12px] flex items-center gap-1 text-[15px] font-normal leading-none tracking-normal text-white/90" style={kodeMonoStyle}>
            additional filters
            <CircleHelp className="h-3.5 w-3.5 text-white/60" />
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, activeOnly: !filters.activeOnly })}
              className={cn(
                "h-9 w-[109px] border px-0 text-center text-[12px] font-bold leading-none tracking-[0] transition-colors",
                filters.activeOnly
                  ? "border-[#14f195] bg-[#0A201A] text-[#14f195]"
                  : "border-[#555] text-white hover:border-white/80"
              )}
              style={kodeMonoStyle}
            >
              Best matches
            </button>
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, openToMeet: !filters.openToMeet })}
              className={cn(
                "h-9 w-[141px] border px-0 text-center text-[12px] font-bold leading-none tracking-[0] transition-colors",
                filters.openToMeet
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
