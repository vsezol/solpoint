"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import { Search, ArrowUpDown, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type EntityTypeFilter = "all" | "community" | "hubs" | "workspaces" | "projects";
export type SortOption = "recommended" | "name" | "members" | "country";

export interface HubsControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  entityTypeFilter: EntityTypeFilter;
  onEntityTypeFilterChange: (filter: EntityTypeFilter) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onAddClick?: () => void;
}

export function HubsControls({
  searchQuery,
  onSearchChange,
  entityTypeFilter,
  onEntityTypeFilterChange,
  sortBy,
  onSortChange,
  onAddClick,
}: HubsControlsProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);

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
    { value: "country", label: "Country" },
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
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Entity Type Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Home className="w-4 h-4 text-[var(--color-primary)] mr-1" />
          <div className="flex flex-wrap gap-2">
            {entityTypeButtons.map((button) => (
              <button
                key={button.value}
                onClick={() => onEntityTypeFilterChange(button.value)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  "border border-[var(--color-surface-border)]",
                  entityTypeFilter === button.value
                    ? "bg-[var(--color-primary)] text-[var(--color-background)] border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sort Row */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
        <span className="text-sm text-[var(--color-text-secondary)]">Sort by:</span>
        <div className="relative">
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              "bg-[var(--color-primary)] text-[var(--color-background)]",
              "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
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
                      onSortChange(option.value);
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

      {/* Add Button */}
      {onAddClick && (
        <div className="flex justify-end">
          <div className="w-full sm:w-auto">
            <div className="text-sm text-[var(--color-text-secondary)] mb-2 sm:hidden">
              Are you a founder or organizer?
            </div>
            <button
              onClick={onAddClick}
              className={cn(
                "w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-medium transition-colors",
                "bg-[var(--color-primary)] text-[var(--color-background)]",
                "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              )}
            >
              Add your hub, community, or project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

