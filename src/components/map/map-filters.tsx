"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui";
import { AuthRequiredModal, ProSubscriptionModal } from "@/components/ui";
import type { MapFilters, UserRole, EventType, ContentTypeFilter } from "@/types";
import { cn } from "@/lib/utils";
import CountrySelect from "@/app/map/country-select";
import { useMapStore } from "@/store/map-store";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";

const userRoles: { value: UserRole; label: string; description?: string }[] = [
  { value: "developer", label: "Developer" },
  { value: "trader", label: "Trader" },
  { value: "investor", label: "Investor" },
  { value: "designer", label: "Designer" },
  { value: "founder", label: "Founder" },
  { value: "degen", label: "Degen" },
  { value: "other", label: "Other" },
];

const eventTypes: { value: EventType; label: string }[] = [
  { value: "official", label: "Official" },
  { value: "community", label: "Community" },
  { value: "meetup", label: "Meetup" },
  { value: "private", label: "Private" },
];

interface MapFiltersProps {
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  isVip?: boolean;
}

export function MapFiltersPanel({
  filters,
  onFiltersChange,
  isVip = false,
}: MapFiltersProps) {
  const { country, setCountry } = useMapStore();
  const { isAuthenticated, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  const handleFilterAction = (action: () => void) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    action();
  };

  // Синхронизируем выбранную страну из store с фильтрами
  useEffect(() => {
    if (country) {
      onFiltersChange({
        ...filters,
        country: country.name,
        countryCode: country.code,
      });
    } else {
      onFiltersChange({
        ...filters,
        country: undefined,
        countryCode: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  const handleReset = () => {
    setCountry(null);
    trackEvent("map_filter_reset", {
      event_category: "Map",
    });
    onFiltersChange({
      showUsers: true,
      showEvents: true,
      showHubs: true,
      showCommunities: true,
      showWorkspaces: true,
      contentType: "all",
      userRoles: undefined,
      eventType: undefined,
      openToMeet: undefined,
      activeOnly: undefined,
      country: undefined,
      countryCode: undefined,
      city: undefined,
    });
  };

  const handleContentTypeChange = (contentType: ContentTypeFilter) => {
    handleFilterAction(() => {
      trackEvent("map_filter_change", {
        event_category: "Map",
        filter_type: "content_type",
        filter_value: contentType,
      });
      onFiltersChange({
        ...filters,
        contentType,
        // Автоматически обновляем showUsers, showEvents, showHubs, showCommunities и showWorkspaces в зависимости от выбора
        showUsers: contentType === "all" || contentType === "users",
        showEvents: contentType === "all" || contentType === "events",
        showHubs: contentType === "all" || contentType === "hubs" || contentType === "workspaces",
        showCommunities: contentType === "all" || contentType === "hubs" || contentType === "workspaces",
        showWorkspaces: contentType === "all" || contentType === "hubs" || contentType === "workspaces",
      });
    });
  };

  const toggleRole = (role: UserRole) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (isAuthenticated && !isVip) {
      setShowProModal(true);
      return;
    }
    const currentRoles = filters.userRoles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    trackEvent("map_filter_change", {
      event_category: "Map",
      filter_type: "user_role",
      filter_value: role,
      is_added: !currentRoles.includes(role),
    });
    onFiltersChange({
      ...filters,
      userRoles: newRoles.length > 0 ? newRoles : undefined,
    });
  };

  const toggleEventType = (eventType: EventType) => {
    handleFilterAction(() => {
      const isRemoving = filters.eventType === eventType;
      trackEvent("map_filter_change", {
        event_category: "Map",
        filter_type: "event_type",
        filter_value: isRemoving ? "none" : eventType,
      });
      onFiltersChange({
        ...filters,
        eventType: isRemoving ? undefined : eventType,
      });
    });
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-surface-border)]">
        <h3 className="font-semibold text-[var(--color-text-primary)]">
          Filters
        </h3>
        <button
          onClick={handleReset}
          className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Content Type Filter */}
        <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-2">
            Show
          </label>
          <div className="flex gap-1.5 mb-2">
            {[
              { value: "all" as ContentTypeFilter, label: "All" },
              { value: "users" as ContentTypeFilter, label: "Users" },
              { value: "events" as ContentTypeFilter, label: "Events" },
            ].map((option) => {
              const isSelected = filters.contentType === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleContentTypeChange(option.value)}
                  className={cn(
                    "flex-1 px-2 py-1 text-xs rounded-md border transition-colors",
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                      : "border-[var(--color-surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {/* Hubs/Communities/Workspaces Button */}
          <button
            onClick={() => handleContentTypeChange("hubs")}
            className={cn(
              "w-full px-2 py-1 text-xs rounded-md border transition-colors",
              filters.contentType === "hubs"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                : "border-[var(--color-surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
            )}
          >
            Hubs/Communities/Workspaces
          </button>
        </div>

        {/* Country Select */}
        <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-2">
            Country
          </label>
          <CountrySelect />
        </div>
    

        {/* City filter */}
        <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-2">
            City
          </label>
          <Input
            placeholder="Enter city..."
            value={filters.city || ""}
            onChange={(e) => {
              if (!isAuthenticated) {
                setShowAuthModal(true);
                return;
              }
              if (isAuthenticated && !isVip) {
                setShowProModal(true);
                return;
              }
              onFiltersChange({ ...filters, city: e.target.value || undefined });
            }}
            onFocus={() => {
              if (!isAuthenticated) {
                setShowAuthModal(true);
                return;
              }
              if (isAuthenticated && !isVip) {
                setShowProModal(true);
              }
            }}
          />
        </div>

        {/* Event Type */}
        <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-3">
            Events by category
          </label>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map((type) => {
              const isSelected = filters.eventType === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => toggleEventType(type.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full border transition-colors",
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                  )}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* User roles */}
        <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-3">
            User Types
          </label>
          <div className="flex flex-wrap gap-2">
            {userRoles.map((role) => {
              const isSelected = filters.userRoles?.includes(role.value);
              return (
                <button
                  key={role.value}
                  onClick={() => toggleRole(role.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full border transition-colors",
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                  )}
                >
                  {role.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggle switches */}
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-[var(--color-text-secondary)]">
              Find frens
            </span>
            <button
              onClick={() => {
                handleFilterAction(() => {
                  const newOpenToMeet = !filters.openToMeet;
                  if (newOpenToMeet) {
                    // При включении "Find frens" сбрасываем все остальные фильтры
                    setCountry(null);
                    onFiltersChange({
                      showUsers: true,
                      showEvents: false,
                      showHubs: false,
                      showCommunities: false,
                      showWorkspaces: false,
                      contentType: "users",
                      userRoles: undefined,
                      eventType: undefined,
                      openToMeet: true,
                      activeOnly: undefined,
                      country: undefined,
                      countryCode: undefined,
                      city: undefined,
                    });
                  } else {
                    // При выключении просто убираем фильтр openToMeet
                    onFiltersChange({
                      ...filters,
                      openToMeet: false,
                    });
                  }
                });
              }}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative",
                filters.openToMeet
                  ? "bg-[var(--color-primary)]"
                  : "bg-[var(--color-surface-border)]"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                  filters.openToMeet ? "left-6" : "left-1"
                )}
              />
            </button>
          </label>

          {isVip && (
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Active users only
              </span>
              <button
                onClick={() => {
                  const newActiveOnly = !filters.activeOnly;
                  trackEvent("map_filter_change", {
                    event_category: "Map",
                    filter_type: "active_only",
                    filter_value: newActiveOnly ? "true" : "false",
                  });
                  onFiltersChange({
                    ...filters,
                    activeOnly: newActiveOnly,
                  });
                }}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative",
                  filters.activeOnly
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--color-surface-border)]"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    filters.activeOnly ? "left-6" : "left-1"
                  )}
                />
              </button>
            </label>
          )}
        </div>
      </div>

      {/* Active Filter Indicator Labels */}
      {(filters.contentType && filters.contentType !== "all") || filters.country || filters.city || filters.userRoles?.length || filters.eventType ? (
        <div className="p-4 border-t border-[var(--color-surface-border)]">
          <label className="block text-sm text-[var(--color-text-muted)] mb-2">
            Active Filter Indicator Labels:
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.contentType && filters.contentType !== "all" && (
              <span className="px-3 py-1.5 text-sm rounded-full bg-[var(--color-surface-border)] text-[var(--color-text-primary)] flex items-center gap-2">
                {filters.contentType === "users" ? "Users" : filters.contentType === "events" ? "Events" : filters.contentType === "workspaces" ? "Workspaces" : "Hubs/Communities/Workspaces"}
                <button
                  onClick={() => handleContentTypeChange("all")}
                  className="hover:text-[var(--color-primary)] transition-colors"
                >
                  ×
                </button>
              </span>
            )}
            {filters.country && (
              <span className="px-3 py-1.5 text-sm rounded-full bg-[var(--color-surface-border)] text-[var(--color-text-primary)] flex items-center gap-2">
                {filters.country}
                <button
                  onClick={() => {
                    setCountry(null);
                    onFiltersChange({ ...filters, country: undefined, countryCode: undefined });
                  }}
                  className="hover:text-[var(--color-primary)] transition-colors"
                >
                  ×
                </button>
              </span>
            )}
            {filters.city && (
              <span className="px-3 py-1.5 text-sm rounded-full bg-[var(--color-surface-border)] text-[var(--color-text-primary)] flex items-center gap-2">
                {filters.city}
                <button
                  onClick={() => onFiltersChange({ ...filters, city: undefined })}
                  className="hover:text-[var(--color-primary)] transition-colors"
                >
                  ×
                </button>
              </span>
            )}
            {filters.userRoles?.map((role) => {
              const roleLabel = userRoles.find((r) => r.value === role)?.label || role;
              return (
                <span
                  key={role}
                  className="px-3 py-1.5 text-sm rounded-full bg-[var(--color-surface-border)] text-[var(--color-text-primary)] flex items-center gap-2"
                >
                  {roleLabel}
                  <button
                    onClick={() => toggleRole(role)}
                    className="hover:text-[var(--color-primary)] transition-colors"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            {filters.eventType && (
              <span className="px-3 py-1.5 text-sm rounded-full bg-[var(--color-surface-border)] text-[var(--color-text-primary)] flex items-center gap-2">
                {eventTypes.find((t) => t.value === filters.eventType)?.label || filters.eventType}
                <button
                  onClick={() => onFiltersChange({ ...filters, eventType: undefined })}
                  className="hover:text-[var(--color-primary)] transition-colors"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      ) : null}

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign up or log in to use filters"
        description="Please sign up or log in to use map filters and search."
      />
      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description="City and user type filters are available only with PRO subscription. Upgrade to PRO to unlock these features."
      />
    </div>
  );
}

