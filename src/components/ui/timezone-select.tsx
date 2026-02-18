"use client";

import { useId, useMemo, useState } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { getIanaTimezones } from "@/lib/utils/timezone";

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const ALL_TIMEZONES = getIanaTimezones();

export function TimezoneSelect({
  value,
  onChange,
  className,
  disabled = false,
}: TimezoneSelectProps) {
  const [query, setQuery] = useState("");
  const inputId = useId();

  const options = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return ALL_TIMEZONES;
    return ALL_TIMEZONES.filter((timezone) =>
      timezone.toLowerCase().includes(normalized)
    );
  }, [query]);

  return (
    <div className={cn("space-y-2", className)}>
      <Input
        id={inputId}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search timezone"
        disabled={disabled}
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={cn(
          "w-full h-10 px-3 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] transition-colors",
          "focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <option value="">Select timezone</option>
        {options.map((timezone) => (
          <option key={timezone} value={timezone}>
            {timezone}
          </option>
        ))}
      </select>
      {options.length === 0 && (
        <p className="text-xs text-[var(--color-text-secondary)]">
          No matches found.
        </p>
      )}
    </div>
  );
}
