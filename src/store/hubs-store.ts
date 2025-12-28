import { create } from "zustand";

export type EntityTypeFilter = "all" | "community" | "hubs" | "workspaces" | "projects";
export type SortOption = "recommended" | "name" | "members" | "country";

interface HubsState {
  searchQuery: string;
  entityTypeFilter: EntityTypeFilter;
  sortBy: SortOption;
  setSearchQuery: (query: string) => void;
  setEntityTypeFilter: (filter: EntityTypeFilter) => void;
  setSortBy: (sort: SortOption) => void;
}

export const useHubsStore = create<HubsState>((set) => ({
  searchQuery: "",
  entityTypeFilter: "all",
  sortBy: "recommended",
  setSearchQuery: (query) => set({ searchQuery: query }),
  setEntityTypeFilter: (filter) => set({ entityTypeFilter: filter }),
  setSortBy: (sort) => set({ sortBy: sort }),
}));

