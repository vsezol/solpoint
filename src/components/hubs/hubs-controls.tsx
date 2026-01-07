"use client";

import { useState } from "react";
import { Input, FilterTag } from "@/components/ui";
import { AuthRequiredModal } from "@/components/ui/auth-required-modal";
import { Search, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHubsStore } from "@/store/hubs-store";
import type { EntityTypeFilter, SortOption } from "@/store/hubs-store";
import { useAuth } from "@/hooks/use-auth";

export function HubsControls() {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated } = useAuth();
  const { searchQuery, setSearchQuery, sortBy, setSortBy, entityTypeFilter, setEntityTypeFilter } = useHubsStore();

  const handleFilterAction = (action: () => void) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    action();
  };

  const entityTypeButtons: { value: EntityTypeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "community", label: "Community" },
    { value: "hubs", label: "Hubs" },
    { value: "workspaces", label: "Workspaces" },
    { value: "projects", label: "Projects" },
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "recommended", label: "Recommended" },
    { value: "name", label: "Name" },
    { value: "members", label: "Members" },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Entity Type Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="flex-1 w-full sm:max-w-md">
          <Input
            placeholder="Search by name, city, or country..."
            icon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => {
              if (!isAuthenticated) {
                setShowAuthModal(true);
                return;
              }
              setSearchQuery(e.target.value);
            }}
            onFocus={() => {
              if (!isAuthenticated) {
                setShowAuthModal(true);
              }
            }}
          />
        </div>

        {/* Entity Type Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {entityTypeButtons.map((button) => (
            <FilterTag
              key={button.value}
              isActive={entityTypeFilter === button.value}
              onClick={() => handleFilterAction(() => setEntityTypeFilter(button.value))}
            >
              {button.label}
            </FilterTag>
          ))}
        </div>
      </div>

      {/* Sort Row */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
        <span className="text-sm text-[var(--color-text-secondary)]">Sort by:</span>
        <div className="relative">
          <button
            onClick={() => handleFilterAction(() => setIsSortOpen(!isSortOpen))}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              "border border-[var(--color-filter-border)] bg-[var(--color-filter-bg)] text-[var(--color-text-primary)]",
              "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-filter-border)] focus:ring-offset-2"
            )}
          >
            {sortOptions.find((opt) => opt.value === sortBy)?.label || "Recommended"}
            <span className="ml-1">▼</span>
          </button>

          {isSortOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsSortOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg shadow-lg z-20">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setIsSortOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm transition-colors",
                      "hover:bg-[var(--color-surface-hover)]",
                      sortBy === option.value &&
                        "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="This feature is available only for logged-in users"
        description="Please sign up or log in to use filters, search, and sorting."
      />
    </div>
  );
}

