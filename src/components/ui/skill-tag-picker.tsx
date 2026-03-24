"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkillCategoryDefinition, SkillDefinition } from "@/lib/profile-taxonomy";

interface SkillTagPickerProps {
  categories: SkillCategoryDefinition[];
  items: SkillDefinition[];
  selectedSlugs: string[];
  onChange: (next: string[]) => void;
  maxSelected: number;
  className?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

export function SkillTagPicker({
  categories,
  items,
  selectedSlugs,
  onChange,
  maxSelected,
  className,
  searchPlaceholder = "Search skills",
  disabled = false,
}: SkillTagPickerProps) {
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);
  const selectedItems = useMemo(
    () => selectedSlugs.map((slug) => items.find((item) => item.slug === slug)).filter(Boolean) as SkillDefinition[],
    [items, selectedSlugs]
  );

  const filteredByCategory = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q
      ? items.filter((item) => item.label.toLowerCase().includes(q) || item.slug.includes(q))
      : items;

    const map = new Map<string, SkillDefinition[]>();
    for (const item of visible) {
      const existing = map.get(item.category) || [];
      existing.push(item);
      map.set(item.category, existing);
    }
    return map;
  }, [items, query]);

  const hasReachedLimit = selectedSlugs.length >= maxSelected;

  const toggleSkill = (slug: string) => {
    if (disabled) return;
    if (selectedSet.has(slug)) {
      onChange(selectedSlugs.filter((value) => value !== slug));
      return;
    }
    if (hasReachedLimit) return;
    onChange([...selectedSlugs, slug]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/65">Selected {selectedSlugs.length}/{maxSelected}</p>
      </div>

      <div className="rounded-[6px] border border-white/10 bg-black px-3">
        <div className="flex h-10 items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-white/55" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-sm text-white placeholder:text-white/45 outline-none"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedItems.length === 0 ? (
          <span className="text-xs text-white/45">No skills selected.</span>
        ) : (
          selectedItems.map((item) => (
            <button
              key={item.slug}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)]/15 px-2.5 py-1 text-xs text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/20"
              onClick={() => toggleSkill(item.slug)}
              disabled={disabled}
            >
              <span>{item.label}</span>
              <X className="h-3 w-3" />
            </button>
          ))
        )}
      </div>

      <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
        {categories.map((category) => {
          const categoryItems = filteredByCategory.get(category.slug) || [];
          if (categoryItems.length === 0) return null;
          return (
            <section key={category.slug} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-white/55">{category.name}</h4>
              <div className="flex flex-wrap gap-2">
                {categoryItems.map((item) => {
                  const selected = selectedSet.has(item.slug);
                  const limitReached = !selected && hasReachedLimit;
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => toggleSkill(item.slug)}
                      disabled={disabled || limitReached}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        selected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                          : limitReached
                            ? "cursor-not-allowed border-white/10 text-white/35"
                            : "border-white/20 text-white/70 hover:border-white/50 hover:text-white"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
