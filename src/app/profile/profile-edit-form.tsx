"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Save, X, MapPin, Search, Check, Globe, Twitter, Instagram, Facebook, Send, Youtube, MessageSquare, Github, Linkedin, BookOpen, Rss } from "lucide-react";
// RefreshCw - используется только в закомментированном коде
import type { User, UserRole } from "@/types";
// import { useGeolocation } from "@/hooks/use-geolocation"; // Закомментировано: временно отключаем автоматическое определение локации
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import countries from "../../../supabase/coutries";
import type { Country } from "@/store/map-store";
import { USER_ROLE_OPTIONS } from "@/lib/profile-taxonomy";

const ROLES: UserRole[] = USER_ROLE_OPTIONS.map((option) => option.value);

interface ProfileEditFormProps {
  user: User;
  onCancel: () => void;
  onUpdate?: (updatedUser: User) => void;
}

type Tab = "personal" | "professional" | "social";
const TABS: Tab[] = ["personal", "professional", "social"];

export function ProfileEditForm({ user, onCancel, onUpdate }: ProfileEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  // const { isDetecting, requestGeolocation } = useGeolocation(); // Закомментировано: временно отключаем автоматическое определение локации
  const formRef = useRef<HTMLFormElement>(null);

  // Form state
  const [bio, setBio] = useState(user.bio || "");
  const [role, setRole] = useState<UserRole>(user.role || "other");
  const [isOpenToMeet, setIsOpenToMeet] = useState(user.is_open_to_meet || false);
  const [country, setCountry] = useState(user.country || "");
  const [countryCode, setCountryCode] = useState<string | undefined>(user.country_code);
  const [city, setCity] = useState(user.city || "");
  const [socialsInstagram, setSocialsInstagram] = useState(user.socials?.instagram || "");
  const [socialsFacebook, setSocialsFacebook] = useState(user.socials?.facebook || "");
  const [socialsTelegram, setSocialsTelegram] = useState(user.socials?.telegram || "");
  const [socialsYoutube, setSocialsYoutube] = useState(user.socials?.youtube || "");
  const [socialsDiscord, setSocialsDiscord] = useState(user.socials?.discord || "");
  const [socialsGithub, setSocialsGithub] = useState(user.socials?.github || "");
  const [socialsLinkedin, setSocialsLinkedin] = useState(user.socials?.linkedin || "");
  const [socialsMedium, setSocialsMedium] = useState(user.socials?.medium || "");
  const [socialsSubstack, setSocialsSubstack] = useState(user.socials?.substack || "");

  // Country selection state
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Скролл к форме при монтировании
  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

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
          socials: {
            instagram: socialsInstagram.trim() || null,
            facebook: socialsFacebook.trim() || null,
            telegram: socialsTelegram.trim() || null,
            youtube: socialsYoutube.trim() || null,
            discord: socialsDiscord.trim() || null,
            github: socialsGithub.trim() || null,
            linkedin: socialsLinkedin.trim() || null,
            medium: socialsMedium.trim() || null,
            substack: socialsSubstack.trim() || null,
          },
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
    <form ref={formRef} onSubmit={handleSubmit}>
      {/* Tab navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 47, paddingLeft: 36, marginBottom: 28 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              fontFamily: "var(--font-kode-mono), monospace",
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: "2px",
              width: 142,
              height: 67,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              borderRadius: 17,
              border: activeTab === tab ? "1.5px solid #232323" : "1.5px solid transparent",
              cursor: "pointer",
              color: activeTab === tab ? "var(--color-text-primary)" : "var(--color-text-muted)",
              transition: "border-color 0.2s, color 0.2s",
            }}
          >
            <span style={{ fontFamily: "var(--font-kode-mono), monospace" }}>{tab}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-6 px-1">
        {/* PERSONAL */}
        {activeTab === "personal" && (
          <>
            <Card variant="bordered">
              <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">About</h3>
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

            <Card variant="bordered">
              <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Location</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">Country</label>
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
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">City</label>
                  <Input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter city name"
                  />
                </div>
              </div>
            </Card>
          </>
        )}

        {/* PROFESSIONAL */}
        {activeTab === "professional" && (
          <Card variant="bordered">
            <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] transition-colors focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {USER_ROLE_OPTIONS.find((option) => option.value === r)?.label || r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_open_to_meet"
                  checked={isOpenToMeet}
                  onChange={(e) => setIsOpenToMeet(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--color-surface-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-2"
                />
                <label htmlFor="is_open_to_meet" className="text-sm text-[var(--color-text-primary)] cursor-pointer">
                  Open to meet
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* SOCIAL */}
        {activeTab === "social" && (
          <Card variant="bordered">
            <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Social Media
            </h3>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-surface-border)]">
                <div className="flex items-center gap-2 mb-1">
                  <Twitter className="w-4 h-4 text-[var(--color-text-muted)]" />
                  <label className="text-sm font-medium text-[var(--color-text-primary)]">Twitter</label>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Your Twitter link is automatically generated from your username:{" "}
                  <span className="font-mono">@{user.twitter_handle}</span>
                </p>
              </div>

              {[
                { label: "Instagram", value: socialsInstagram, setter: setSocialsInstagram, placeholder: "https://instagram.com/...", icon: <Instagram className="w-4 h-4" /> },
                { label: "Facebook", value: socialsFacebook, setter: setSocialsFacebook, placeholder: "https://facebook.com/...", icon: <Facebook className="w-4 h-4" /> },
                { label: "Telegram", value: socialsTelegram, setter: setSocialsTelegram, placeholder: "https://t.me/...", icon: <Send className="w-4 h-4" /> },
                { label: "YouTube", value: socialsYoutube, setter: setSocialsYoutube, placeholder: "https://youtube.com/@...", icon: <Youtube className="w-4 h-4" /> },
                { label: "Discord", value: socialsDiscord, setter: setSocialsDiscord, placeholder: "https://discord.gg/...", icon: <MessageSquare className="w-4 h-4" /> },
                { label: "GitHub", value: socialsGithub, setter: setSocialsGithub, placeholder: "https://github.com/...", icon: <Github className="w-4 h-4" /> },
                { label: "LinkedIn", value: socialsLinkedin, setter: setSocialsLinkedin, placeholder: "https://linkedin.com/in/...", icon: <Linkedin className="w-4 h-4" /> },
                { label: "Medium", value: socialsMedium, setter: setSocialsMedium, placeholder: "https://medium.com/@...", icon: <BookOpen className="w-4 h-4" /> },
                { label: "Substack", value: socialsSubstack, setter: setSocialsSubstack, placeholder: "https://substack.com/@...", icon: <Rss className="w-4 h-4" /> },
              ].map(({ label, value, setter, placeholder, icon }) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">{label}</label>
                  <Input
                    type="url"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    icon={icon}
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button type="submit" isLoading={isLoading} disabled={isLoading} className="flex-1 font-bold">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="font-bold">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
