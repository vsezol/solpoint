"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkillCategoryDefinition, SkillDefinition } from "@/lib/profile-taxonomy";

const kodeMono14Bold = {
  fontFamily: "var(--font-kode-mono), monospace",
  fontWeight: 700,
  fontSize: 14,
  lineHeight: 1,
  letterSpacing: 0,
} as const;

const spaceGrotesk16Semibold = {
  fontFamily: "var(--font-display), sans-serif",
  fontWeight: 600,
  fontSize: 16,
  lineHeight: 1,
  letterSpacing: 0,
} as const;

const spaceGrotesk12Medium = {
  fontFamily: "var(--font-display), sans-serif",
  fontWeight: 500,
  fontSize: 12,
  lineHeight: 1,
  letterSpacing: 0,
} as const;

const spaceGrotesk14Medium = {
  fontFamily: "var(--font-display), sans-serif",
  fontWeight: 500,
  fontSize: 14,
  lineHeight: 1,
  letterSpacing: 0,
} as const;

interface SkillTagPickerProps {
  categories: SkillCategoryDefinition[];
  items: SkillDefinition[];
  selectedSlugs: string[];
  onChange: (next: string[]) => void;
  maxSelected: number;
  className?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  /** Default: "pills" (legacy). Use "toggles" for the new 2-col checkbox look. */
  variant?: "pills" | "toggles";
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
  variant = "pills",
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

  const categoryDefaultExpanded = useMemo(() => {
    if (variant !== "toggles") return new Set<string>();
    const selectedCategories = new Set(
      selectedItems.map((s) => s.category).filter(Boolean) as string[]
    );
    if (selectedCategories.size > 0) return selectedCategories;
    const first = categories[0]?.slug;
    return first ? new Set([first]) : new Set<string>();
  }, [categories, selectedItems, variant]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(categoryDefaultExpanded);

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
        <p className="text-xs text-white/65" style={spaceGrotesk12Medium}>
          Selected {selectedSlugs.length}/{maxSelected}
        </p>
      </div>

      {variant === "toggles" ? (
        <div className="space-y-2">
          {selectedItems.length === 0 ? (
            <span className="text-xs text-white/45" style={spaceGrotesk12Medium}>
              No skills selected.
            </span>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {selectedItems.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => toggleSkill(item.slug)}
                  disabled={disabled}
                  aria-pressed={true}
                  className={cn(
                    "group flex w-full items-center justify-between gap-3 text-left transition-opacity",
                    disabled && "cursor-not-allowed opacity-45"
                  )}
                >
                  <span className="text-white" style={kodeMono14Bold}>
                    {item.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid h-[13px] w-[13px] place-items-center rounded-[2px] border border-[#313131] bg-[#0F0F0F]",
                      !disabled && "group-hover:border-white/40"
                    )}
                    style={{ borderWidth: 1 }}
                  >
                    <span className="h-[7px] w-[7px] rounded-[1px] bg-white" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="rounded-[6px] border border-white/10 bg-black px-3 transition-colors focus-within:border-white/70">
        <div className="flex h-10 items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-white/55" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="profile-v2-field w-full bg-transparent text-sm text-white placeholder:text-white/45 outline-none ring-0 focus:ring-0 focus:outline-none"
            style={spaceGrotesk14Medium}
            disabled={disabled}
          />
        </div>
      </div>

      {variant === "pills" ? (
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
      ) : null}

      <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
        {categories.map((category) => {
          const categoryItems = filteredByCategory.get(category.slug) || [];
          if (categoryItems.length === 0) return null;

          if (variant === "toggles") {
            const isExpanded = expandedCategories.has(category.slug);
            return (
              <section key={category.slug} className="space-y-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-[6px] border border-white/10 bg-white/[0.02] px-2.5 py-2 text-left"
                  onClick={() =>
                    setExpandedCategories((prev) => {
                      const next = new Set(prev);
                      if (next.has(category.slug)) next.delete(category.slug);
                      else next.add(category.slug);
                      return next;
                    })
                  }
                  disabled={disabled}
                  aria-expanded={isExpanded}
                >
                  <span className="text-white/85" style={spaceGrotesk16Semibold}>
                    {category.name}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-white/55 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {isExpanded ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    {categoryItems.map((item) => {
                      const selected = selectedSet.has(item.slug);
                      const limitReached = !selected && hasReachedLimit;
                      return (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => toggleSkill(item.slug)}
                          disabled={disabled || limitReached}
                          aria-pressed={selected}
                          className={cn(
                            "group flex w-full items-center justify-between gap-3 text-left transition-opacity",
                            (disabled || limitReached) && "cursor-not-allowed opacity-45"
                          )}
                        >
                          <span className="text-white" style={kodeMono14Bold}>
                            {item.label}
                          </span>
                          <span
                            aria-hidden="true"
                            className={cn(
                              "grid h-[13px] w-[13px] place-items-center rounded-[2px] border border-[#313131] bg-[#0F0F0F]",
                              !(disabled || limitReached) && "group-hover:border-white/40"
                            )}
                            style={{ borderWidth: 1 }}
                          >
                            {selected ? <span className="h-[7px] w-[7px] rounded-[1px] bg-white" /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          }

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
