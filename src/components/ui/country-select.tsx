"use client";

import { useState, useEffect } from "react";
import { getCountries, COUNTRIES_STATIC } from "@/lib/countries";
import type { Country } from "@/types";

interface CountrySelectProps {
  value?: string; // ISO country code
  onChange: (code: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select a country",
  className = "",
  disabled = false,
}: CountrySelectProps) {
  const [countries, setCountries] = useState<Country[]>(COUNTRIES_STATIC);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCountries() {
      setIsLoading(true);
      const fetchedCountries = await getCountries();
      
      if (fetchedCountries.length > 0) {
        setCountries(fetchedCountries);
      }
      
      setIsLoading(false);
    }

    loadCountries();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    onChange(newValue === "" ? undefined : newValue);
  };

  return (
    <select
      value={value || ""}
      onChange={handleChange}
      disabled={disabled || isLoading}
      className={`w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <option value="">{placeholder}</option>
      {countries.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name} ({country.code})
        </option>
      ))}
    </select>
  );
}

