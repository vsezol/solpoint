"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Save, X, MapPin, Search, Check } from "lucide-react";
// RefreshCw - используется только в закомментированном коде
import type { User, UserRole } from "@/types";
// import { useGeolocation } from "@/hooks/use-geolocation"; // Закомментировано: временно отключаем автоматическое определение локации
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import countries from "../../../supabase/coutries";
import type { Country } from "@/store/map-store";

const ROLES: UserRole[] = [
  "degen",
  "developer",
  "trader",
  "investor",
  "designer",
  "founder",
  "other",
];

interface ProfileEditFormProps {
  user: User;
  onCancel: () => void;
  onUpdate?: (updatedUser: User) => void;
}

export function ProfileEditForm({ user, onCancel, onUpdate }: ProfileEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const { isDetecting, requestGeolocation } = useGeolocation(); // Закомментировано: временно отключаем автоматическое определение локации

  // Form state
  const [bio, setBio] = useState(user.bio || "");
  const [role, setRole] = useState<UserRole>(user.role || "degen");
  const [isOpenToMeet, setIsOpenToMeet] = useState(user.is_open_to_meet || false);
  const [country, setCountry] = useState(user.country || "");
  const [countryCode, setCountryCode] = useState<string | undefined>(user.country_code);
  const [city, setCity] = useState(user.city || "");

  // Country selection state
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Закомментировано: временно отключаем автоматическое определение локации через браузер
  // const handleDetectLocation = async () => {
  //   try {
  //     const result = await requestGeolocation();
  //     if (result) {
  //       setCountry(result.country);
  //       setCountryCode(result.country_code);
  //       setCity(result.city || "");
  //     }
  //   } catch (error) {
  //     console.error("Error detecting location:", error);
  //     setError("Failed to detect location. Please try again.");
  //   }
  // };

  const filteredCountries = countries.filter((c: Country) =>
    c.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  const handleSelectCountry = (selectedCountry: Country) => {
    setCountry(selectedCountry.name);
    setCountryCode(selectedCountry.code);
    setCountrySearchQuery("");
    setIsCountryDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredCountries.length > 0) {
      handleSelectCountry(filteredCountries[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bio: bio.trim() || null,
          role,
          is_open_to_meet: isOpenToMeet,
          country: country || null,
          country_code: countryCode || null,
          city: city.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      trackEvent("profile_edit_save", {
        event_category: "Profiles",
        has_bio: !!bio.trim(),
        has_role: !!role,
        is_open_to_meet: isOpenToMeet,
        has_country: !!country,
        has_city: !!city.trim(),
      });

      // Обновляем локальное состояние, если callback передан
      if (onUpdate && data.profile) {
        onUpdate(data.profile);
      }

      // Инвалидируем кэш профиля
      queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
      
      // Обновляем server component данные
      router.refresh();
      
      // Закрываем форму редактирования
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const bioLength = bio.length;
  const maxBioLength = 150;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Bio */}
      <Card variant="bordered">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
          About
        </h3>
        <div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={maxBioLength}
            rows={4}
            placeholder="Tell us about yourself..."
            className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)] text-right">
            {bioLength}/{maxBioLength}
          </p>
        </div>
      </Card>

      {/* Details */}
      <Card variant="bordered">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
          Details
        </h3>
        <div className="space-y-4">
          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] transition-colors focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Location
            </label>
            
            <div className="space-y-3">
              {/* Country Selection */}
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Country
                </label>
                <div className="relative" ref={countryDropdownRef}>
                  <Input
                    placeholder={country || "Select country"}
                    icon={<Search className="w-4 h-4" />}
                    value={countrySearchQuery}
                    onChange={(e) => {
                      setCountrySearchQuery(e.target.value);
                      setIsCountryDropdownOpen(true);
                    }}
                    onFocus={() => setIsCountryDropdownOpen(true)}
                    onKeyDown={handleKeyDown}
                  />

                  {isCountryDropdownOpen && filteredCountries.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCountries.map((selectedCountry: Country) => (
                        <button
                          key={selectedCountry.code}
                          type="button"
                          onClick={() => handleSelectCountry(selectedCountry)}
                          className={cn(
                            "w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[var(--color-surface-border)] transition-colors",
                            countryCode === selectedCountry.code && "bg-[var(--color-primary)]/10"
                          )}
                        >
                          <span
                            className={cn(
                              "text-sm",
                              countryCode === selectedCountry.code
                                ? "text-[var(--color-primary)] font-medium"
                                : "text-[var(--color-text-primary)]"
                            )}
                          >
                            {selectedCountry.name}
                          </span>
                          {countryCode === selectedCountry.code && (
                            <Check className="w-4 h-4 text-[var(--color-primary)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* City Input */}
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  City
                </label>
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city name"
                />
              </div>
            </div>
            
            <p className="mt-2 text-xs text-[var(--color-text-muted)] flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                Country is visible to everyone. City is visible only to VIP users.
              </span>
            </p>
          </div>

          {/* Закомментировано: временно отключаем автоматическое определение локации через браузер */}
          {/* Location Detection */}
          {/* <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                Location
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDetectLocation}
                disabled={isDetecting || isLoading}
                className="h-8 px-2 text-xs"
              >
                {isDetecting ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3 mr-1" />
                    Detect Location
                  </>
                )}
              </Button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Country
                </label>
                <Input
                  type="text"
                  value={country || "Not detected"}
                  readOnly
                  placeholder="Detect location to set country"
                  className="bg-[var(--color-surface-hover)] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  City
                </label>
                <Input
                  type="text"
                  value={city || "Not detected"}
                  readOnly
                  placeholder="Detect location to set city"
                  className="bg-[var(--color-surface-hover)] cursor-not-allowed"
                />
              </div>
            </div>
            
            <p className="mt-2 text-xs text-[var(--color-text-muted)] flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                Click &quot;Detect Location&quot; to automatically set your country and city.
                We only store country and city — never exact coordinates.
              </span>
            </p>
          </div> */}

          {/* Is Open to Meet */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_open_to_meet"
              checked={isOpenToMeet}
              onChange={(e) => setIsOpenToMeet(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--color-surface-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-2"
            />
            <label
              htmlFor="is_open_to_meet"
              className="text-sm text-[var(--color-text-primary)] cursor-pointer"
            >
              Open to meet
            </label>
          </div>
        </div>
      </Card>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
          className="flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

