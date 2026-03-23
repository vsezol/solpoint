"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

const kodeMonoStyle = {
  fontFamily: "var(--font-kode-mono), monospace",
} as const;

const triggerClass =
  "flex h-11 w-full items-center justify-between border border-[#2A2A2A] bg-[#0E0F11] px-3 pr-2 text-left text-[14px] font-bold leading-none tracking-[-0.05em] text-white outline-none transition-colors hover:border-[#3A3A3A] focus-visible:border-[#14f195] focus-visible:ring-1 focus-visible:ring-[#14f195]";

export type MapFilterSelectOption = {
  value: string;
  label: string;
  icon?: string;
};

type MapFilterSelectProps = {
  value: string;
  onChange: (next: string) => void;
  options: MapFilterSelectOption[];
  /** Shown when value is not found in options (fallback) */
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
  /** Search box + optional row icons (e.g. country flags), like profile editor */
  searchable?: boolean;
  searchPlaceholder?: string;
};

export function MapFilterSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  className,
  id,
  "aria-labelledby": ariaLabelledBy,
  searchable = false,
  searchPlaceholder,
}: MapFilterSelectProps) {
  const autoId = useId();
  const listboxId = id ?? `map-filter-select-${autoId}`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;
  const isPlaceholder = searchable ? !value : !selected;

  const filteredOptions = useMemo(() => {
    if (!searchable) return options;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((o) => o.label.toLowerCase().includes(normalized));
  }, [options, query, searchable]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={listboxId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={ariaLabelledBy}
        className={triggerClass}
        style={kodeMonoStyle}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn("flex min-w-0 items-center gap-2 truncate", isPlaceholder && "text-white/70")}>
          {searchable && selected?.icon ? <span aria-hidden>{selected.icon}</span> : null}
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-white/70 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-[100] mt-1 border border-[#2A2A2A] bg-[#0E0F11] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
          style={kodeMonoStyle}
        >
          {searchable ? (
            <div className="border-b border-[#2A2A2A] px-2 pb-2 pt-1">
              <div className="flex h-9 items-center gap-2 border border-[#2A2A2A] bg-black px-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-white/55" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder ?? "Search"}
                  className="w-full bg-transparent text-[12px] font-bold text-white placeholder:text-white/45 focus:outline-none"
                  style={kodeMonoStyle}
                />
              </div>
            </div>
          ) : null}
          <ul role="listbox" aria-label="Options" className="max-h-52 overflow-auto py-1">
            {searchable ? (
              <li role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2.5 text-left text-[14px] font-bold leading-none tracking-[-0.05em] transition-colors",
                    !value
                      ? "bg-[#14f195]/15 text-[#14f195]"
                      : "text-white hover:bg-[#1A1C20] hover:text-[#14f195]"
                  )}
                  onClick={() => {
                    onChange("");
                    close();
                  }}
                >
                  <span>All</span>
                  <span
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 border",
                      !value ? "border-white bg-white" : "border-white/30"
                    )}
                  />
                </button>
              </li>
            ) : null}
            {(searchable ? filteredOptions : options).map((opt) => {
              if (searchable && opt.value === "") return null;
              const isActive = opt.value === value;
              return (
                <li key={opt.value === "" ? "__empty__" : opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[14px] font-bold leading-none tracking-[-0.05em] transition-colors",
                      isActive
                        ? "bg-[#14f195]/15 text-[#14f195]"
                        : "text-white hover:bg-[#1A1C20] hover:text-[#14f195]"
                    )}
                    onClick={() => {
                      onChange(opt.value);
                      close();
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      {opt.icon ? <span aria-hidden>{opt.icon}</span> : null}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {searchable ? (
                      <span
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 border",
                          isActive ? "border-white bg-white" : "border-white/30"
                        )}
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
