"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

const kodeMonoStyle = {
  fontFamily: "var(--font-kode-mono), monospace",
} as const;

const triggerClass =
  "flex h-11 w-full items-center justify-between border border-[#2A2A2A] bg-[#0E0F11] px-3 pr-2 text-left text-[14px] font-bold leading-none tracking-[-0.05em] text-white outline-none transition-colors hover:border-[#3A3A3A] focus-visible:border-[#14f195] focus-visible:ring-1 focus-visible:ring-[#14f195]";

export type MapFilterMultiOption = {
  value: string;
  label: string;
};

type MapFilterMultiSelectProps = {
  values: string[];
  onChange: (next: string[]) => void;
  options: MapFilterMultiOption[];
  placeholder?: string;
  className?: string;
  searchPlaceholder?: string;
};

export function MapFilterMultiSelect({
  values,
  onChange,
  options,
  placeholder = "choose interests",
  className,
  searchPlaceholder = "find interests",
}: MapFilterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const valueSet = useMemo(() => new Set(values), [values]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const displayText = useMemo(() => {
    if (values.length === 0) return placeholder;
    const labels = options.filter((o) => valueSet.has(o.value)).map((o) => o.label);
    if (labels.length === 0) return placeholder;
    if (labels.length === 1) return labels[0];
    return `${labels[0]} +${labels.length - 1}`;
  }, [options, placeholder, valueSet, values.length]);

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
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const toggle = (slug: string) => {
    if (valueSet.has(slug)) {
      onChange(values.filter((v) => v !== slug));
      return;
    }
    onChange([...values, slug]);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={triggerClass}
        style={kodeMonoStyle}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn("min-w-0 truncate", values.length === 0 && "text-white/70")}>{displayText}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-white/70 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-[100] mt-1 border border-[#2A2A2A] bg-[#0E0F11] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
          style={kodeMonoStyle}
        >
          <div className="mb-2 flex h-9 items-center gap-2 border border-[#2A2A2A] bg-black px-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-white/55" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-[12px] font-bold text-white placeholder:text-white/45 focus:outline-none"
              style={kodeMonoStyle}
            />
          </div>

          <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
            <button
              type="button"
              className="flex w-full items-center justify-between px-2 py-2 text-left text-[12px] font-bold text-white transition-colors hover:bg-[#1A1C20]"
              onClick={() => onChange([])}
            >
              <span>All</span>
              <span
                className={cn(
                  "h-3.5 w-3.5 border",
                  values.length === 0 ? "border-white bg-white" : "border-white/30"
                )}
              />
            </button>

            {filteredOptions.map((option) => {
              const checked = valueSet.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-2 py-2 text-left text-[12px] font-bold text-white transition-colors hover:bg-[#1A1C20]"
                  onClick={() => toggle(option.value)}
                >
                  <span className="truncate">{option.label}</span>
                  <span
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 border",
                      checked ? "border-white bg-white" : "border-white/30"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
