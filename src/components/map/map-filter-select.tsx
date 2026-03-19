"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const kodeMonoStyle = {
  fontFamily: "var(--font-kode-mono), monospace",
} as const;

const triggerClass =
  "flex h-11 w-full items-center justify-between border border-[#2A2A2A] bg-[#0E0F11] px-3 pr-2 text-left text-[14px] font-bold leading-none tracking-[-0.05em] text-white outline-none transition-colors hover:border-[#3A3A3A] focus-visible:border-[#14f195] focus-visible:ring-1 focus-visible:ring-[#14f195]";

export type MapFilterSelectOption = {
  value: string;
  label: string;
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
};

export function MapFilterSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  className,
  id,
  "aria-labelledby": ariaLabelledBy,
}: MapFilterSelectProps) {
  const autoId = useId();
  const listboxId = id ?? `map-filter-select-${autoId}`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;
  const isPlaceholder = !selected;

  const close = useCallback(() => setOpen(false), []);

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
        <span className={cn("min-w-0 truncate", isPlaceholder && "text-white/70")}>{displayLabel}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-white/70 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Options"
          className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-auto border border-[#2A2A2A] bg-[#0E0F11] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
          style={kodeMonoStyle}
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li key={opt.value === "" ? "__empty__" : opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={cn(
                    "flex w-full px-3 py-2.5 text-left text-[14px] font-bold leading-none tracking-[-0.05em] transition-colors",
                    isActive
                      ? "bg-[#14f195]/15 text-[#14f195]"
                      : "text-white hover:bg-[#1A1C20] hover:text-[#14f195]"
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    close();
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
