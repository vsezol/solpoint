"use client";

import { Country, useMapStore } from "@/store/map-store";
import { useState, useRef, useEffect } from "react";
import countries from "../../../supabase/coutries";
import { Input } from "@/components/ui";
import { AuthRequiredModal } from "@/components/ui/auth-required-modal";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";

export default function CountrySelect() {
  const { country, setCountry } = useMapStore();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const filtered = countries.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCountry = (c: Country) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      setIsOpen(false);
      return;
    }
    trackEvent("map_filter_change", {
      event_category: "Map",
      filter_type: "country",
      filter_value: c.name,
      country_code: c.code,
    });
    setCountry(c);
    setQuery("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filtered.length > 0) {
      handleSelectCountry(filtered[0]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Input
        placeholder={country ? country.name : "Select country"}
        icon={<Search className="w-4 h-4" />}
        value={query}
        onChange={(e) => {
          if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
          }
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
          }
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((c: Country) => (
            <button
              key={c.code}
              onClick={() => handleSelectCountry(c)}
              className={cn(
                "w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[var(--color-surface-border)] transition-colors",
                country?.code === c.code && "bg-[var(--color-primary)]/10"
              )}
            >
              <span
                className={cn(
                  "text-sm",
                  country?.code === c.code
                    ? "text-[var(--color-primary)] font-medium"
                    : "text-[var(--color-text-primary)]"
                )}
              >
                {c.name}
              </span>
              {country?.code === c.code && (
                <Check className="w-4 h-4 text-[var(--color-primary)]" />
              )}
            </button>
          ))}
        </div>
      )}

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign up or log in to use filters"
        description="Please sign up or log in to use map filters and search."
      />
    </div>
  );
}