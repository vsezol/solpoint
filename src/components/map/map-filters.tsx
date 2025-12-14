"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import type { MapFilters, UserRole } from "@/types";
import { cn } from "@/lib/utils";
import CountrySelect from "@/app/map/country-select";

const userRoles: { value: UserRole; label: string; description?: string }[] = [
  { value: "developer", label: "Developer" },
  { value: "trader", label: "Trader" },
  { value: "investor", label: "Investor" },
  { value: "designer", label: "Designer" },
  { value: "founder", label: "Founder" },
  { value: "degen", label: "Degen" },
  { value: "other", label: "Other" },
];

const domainTypes = [
  { value: ".com", label: ".com", description: "Web2 Classic" },
  { value: "popular", label: "Popular", description: "Trending Now" },
  { value: "dns", label: "DNS", description: "Standard Domains" },
  { value: "web3", label: "Web3", description: "On-chain Names" },
];

const vibeTags = [
  "crypto", "nft", "wallet", "defi", "ai",
  "dao", "eth", "bitcoin", "polygon",
  "layer2", "zk", "gaming", "builder",
  "unstoppable", "meme", "retardio",
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
  const [selectedDomainType, setSelectedDomainType] = useState<string>("web3");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleReset = () => {
    onFiltersChange({
      showUsers: true,
      showEvents: true,
      showHubs: true,
      userRoles: undefined,
      openToMeet: undefined,
      activeOnly: undefined,
      country: undefined,
      city: undefined,
    });
    setSelectedDomainType("web3");
    setSelectedTags([]);
  };

  const toggleRole = (role: UserRole) => {
    const currentRoles = filters.userRoles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    onFiltersChange({
      ...filters,
      userRoles: newRoles.length > 0 ? newRoles : undefined,
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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

          {/* Country Select */}
          <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-2">
            Country
          </label>
          <CountrySelect />
        </div>
    

        {/* City filter (VIP only) */}
        {isVip && (
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-2">
              City:
            </label>
            <Input
              placeholder="Enter city..."
              value={filters.city || ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, city: e.target.value || undefined })
              }
            />
          </div>
        )}

        {/* Domain Type */}
        <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-3">
            Domain Type
          </label>
          <div className="space-y-2">
            {domainTypes.map((type) => (
              <label
                key={type.value}
                className="flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      selectedDomainType === type.value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                        : "border-[var(--color-surface-border)] group-hover:border-[var(--color-text-muted)]"
                    )}
                  >
                    {selectedDomainType === type.value && (
                      <div className="w-2 h-2 rounded-full bg-[var(--color-background)]" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "font-medium transition-colors",
                      selectedDomainType === type.value
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-text-primary)]"
                    )}
                  >
                    {type.label}
                  </span>
                </div>
                <span className="text-sm text-[var(--color-text-muted)]">
                  {type.description}
                </span>
              </label>
            ))}
          </div>
        </div>

      

        {/* Browse by Vibe */}
        <div>
          <div className="mb-2">
            <h4 className="font-semibold text-[var(--color-text-primary)]">
              Browse by Vibe
            </h4>
            <p className="text-sm text-[var(--color-text-muted)]">
              Tap a few tags to match your domain with your niche.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 p-3 border border-[var(--color-surface-border)] rounded-lg">
            {vibeTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full border transition-colors",
                  selectedTags.includes(tag)
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* User roles (VIP only) */}
        {isVip && (
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-3">
              User Roles
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
        )}

        {/* Toggle switches */}
        {isVip && (
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Open to meet
              </span>
              <button
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    openToMeet: !filters.openToMeet,
                  })
                }
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

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Active users only
              </span>
              <button
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    activeOnly: !filters.activeOnly,
                  })
                }
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
          </div>
        )}
      </div>
    </div>
  );
}

