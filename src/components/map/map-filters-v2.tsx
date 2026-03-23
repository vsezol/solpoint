"use client";

import { CircleHelp } from "lucide-react";

import type { ContentTypeFilter, MapFilters, UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { USER_ROLE_OPTIONS } from "@/lib/profile-taxonomy";

import countries from "../../../supabase/coutries";

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

const interestOptions: { value: ContentTypeFilter; label: string }[] = [
  { value: "all", label: "all interests" },
  { value: "users", label: "users" },
  { value: "events", label: "events" },
  { value: "hubs", label: "hubs & communities" },
];

const roleSelectOptions = [{ value: "", label: "choose role" }, ...roleOptions.map((r) => ({ value: r.value, label: r.label }))];

const countrySelectOptions = [
  { value: "", label: "choose country" },
  ...countries.map((c) => ({ value: c.code, label: c.name })),
];

const interestSelectOptions = interestOptions.map((o) => ({
  value: o.value,
  label: o.value === "all" ? "choose interests" : o.label,
}));

export const MAP_V2_DEFAULT_FILTERS: MapFilters = {
  showUsers: true,
  showEvents: true,
  showHubs: true,
  showCommunities: true,
  showWorkspaces: true,
  contentType: "all",
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
  const selectedRole = filters.userRoles?.[0] ?? "";
  const selectedCountryCode = filters.countryCode ?? "";
  const selectedInterest = filters.contentType ?? "all";

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

  const onInterestChange = (contentType: ContentTypeFilter) => {
    onFiltersChange({
      ...filters,
      ...buildContentTypePayload(contentType),
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
          />
        </div>

        <div>
          <FieldLabel>user&apos;s interests</FieldLabel>
          <MapFilterSelect
            className="mb-[20px]"
            value={selectedInterest}
            onChange={(v) => onInterestChange(v as ContentTypeFilter)}
            options={interestSelectOptions}
            placeholder="choose interests"
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
