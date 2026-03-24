"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { SkillTagPicker } from "@/components/ui/skill-tag-picker";
import { Header, Footer } from "@/components/layout";
import { Twitter, MapPin, Globe, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/use-auth";
// import { useGeolocation } from "@/hooks/use-geolocation";
import { trackEvent } from "@/lib/analytics";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import countries from "../../../supabase/coutries";
import type { Country } from "@/store/map-store";
import { MAJOR_CITIES } from "@/lib/countries";
import {
  INTEREST_DEFINITIONS,
  MAX_PROFILE_SKILLS,
  SKILL_CATEGORIES,
  SKILL_DEFINITIONS,
  USER_ROLE_OPTIONS,
} from "@/lib/profile-taxonomy";
import { getSkills } from "@/lib/api/skills";
import type { User } from "@/types";

type Step = "twitter" | "location" | "profile" | "skills" | "complete";

function SignupPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  // const { requestGeolocation } = useGeolocation(); // Закомментировано: временно отключаем автоматическое определение локации
  const stepFromUrl = searchParams.get("step");
  const inviteCode = searchParams.get("invite");
  const message = searchParams.get("message");
  const redirectTo = searchParams.get("redirect_to");
  
  const [step, setStep] = useState<Step>(
    (stepFromUrl === "location" ? "location" : 
     stepFromUrl === "profile" ? "profile" : 
     stepFromUrl === "skills" ? "skills" :
     "twitter") as Step
  );
  const [isLoading, setIsLoading] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    country: "",
    country_code: "" as string | undefined,
    city: "" as string | null,
    bio: "",
    role: "",
    interests: [] as string[],
    skill_slugs: [] as string[],
    isOpenToMeet: false,
  });
  const [skillDictionary, setSkillDictionary] = useState(SKILL_DEFINITIONS);
  const [skillCategories, setSkillCategories] = useState(SKILL_CATEGORIES);

  // Сохраняем invite код в localStorage для использования после регистрации
  useEffect(() => {
    if (inviteCode) {
      localStorage.setItem("inviteCode", inviteCode);
    }
  }, [inviteCode]);

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSkills = async () => {
      try {
        const dictionary = await getSkills();
        if (cancelled) return;
        if (dictionary.items.length > 0) {
          setSkillDictionary(dictionary.items);
        }
        if (dictionary.categories.length > 0) {
          setSkillCategories(dictionary.categories);
        }
      } catch (error) {
        console.error("Failed to load skills dictionary:", error);
      }
    };

    loadSkills();
    return () => {
      cancelled = true;
    };
  }, []);

  // Загружаем данные профиля при загрузке, если пользователь авторизован
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      // Если пользователь уже авторизован и профиль заполнен, редиректим на профиль
      // НО только если нет invite кода (чтобы не пропустить обработку invite)
      if (user.country_code && step === "twitter" && !inviteCode) {
        router.push("/profile");
        return;
      }
      
      // Если есть redirect_to и профиль заполнен, редиректим на него
      if (redirectTo && user.country_code) {
        router.push(redirectTo);
        return;
      }
      
      // Загружаем данные профиля в форму, если они есть
      if (user.country_code || user.city || user.bio || user.role) {
        setFormData((prev) => {
          // Сохраняем данные из БД, но не перезаписываем если они уже были введены в форме
          const shouldKeepCountryCode = prev.country_code && prev.country_code !== "";
          const shouldKeepCity = prev.city && prev.city !== "";
          const userInterestSlugs =
            (user as User & { interest_slugs?: string[] }).interest_slugs || [];
          const userSkillSlugs =
            (user as User & { skill_slugs?: string[] }).skill_slugs || [];
          const newCity = shouldKeepCity ? prev.city : (user.city || prev.city || "");
          
          // Синхронизируем citySearchQuery с загруженным городом
          if (newCity && !shouldKeepCity) {
            setCitySearchQuery(newCity);
          }
          
          return {
            ...prev,
            country: prev.country || user.country || "",
            country_code: shouldKeepCountryCode ? prev.country_code : (user.country_code || prev.country_code),
            city: newCity,
            bio: user.bio || prev.bio || "",
            role: user.role || prev.role || "",
            interests: prev.interests.length > 0 ? prev.interests : userInterestSlugs,
            skill_slugs: prev.skill_slugs.length > 0 ? prev.skill_slugs : userSkillSlugs,
            isOpenToMeet: user.is_open_to_meet !== undefined ? user.is_open_to_meet : prev.isOpenToMeet,
          };
        });
      }
      
      // Если авторизован, но на шаге twitter, переходим к шагу location
      // НО только если нет invite кода в URL (чтобы не пропустить шаг Twitter при регистрации по invite)
      // Если есть invite код, пользователь должен видеть шаг Twitter, чтобы понять что он зарегистрировался
      if (step === "twitter" && !user.country_code && !inviteCode) {
        setStep("location");
      }
    }
  }, [authLoading, isAuthenticated, user, router, step, inviteCode, redirectTo]);

  const handleTwitterSignup = async () => {
    try {
      setIsLoading(true);
      trackEvent("signup_start", {
        event_category: "Authentication",
        method: "twitter",
        has_invite: !!inviteCode,
      });
      // Редиректим на API route для инициации Twitter OAuth
      // После успешной авторизации вернемся на /signup для продолжения процесса
      // Передаем invite код и redirect_to через redirect_to, если они есть
      const signupRedirect = (() => {
        const params = new URLSearchParams();
        if (inviteCode) {
          params.set("invite", inviteCode);
        }
        if (redirectTo) {
          params.set("redirect_to", redirectTo);
        }
        const queryString = params.toString();
        return queryString ? `/signup?${queryString}` : "/signup";
      })();
      
      window.location.href = `/api/auth/twitter?redirect_to=${encodeURIComponent(signupRedirect)}`;
    } catch (error) {
      setIsLoading(false);
      trackEvent("signup_error", {
        event_category: "Authentication",
        error_type: error instanceof Error ? error.message : "unknown",
      });
      alert("Failed to start registration. Please try again.");
    }
  };

 

  // Закомментировано: временно отключаем автоматическое определение локации через браузер
  // const handleLocationPermission = async () => {
  //   console.log("[Signup] handleLocationPermission called");
  //   try {
  //     console.log("[Signup] Calling requestGeolocation...");
  //     const result = await requestGeolocation();
  //     console.log("[Signup] requestGeolocation returned:", result);
  //     
  //     if (result) {
  //       console.log("[Signup] Setting form data with result:", {
  //         country: result.country,
  //         country_code: result.country_code,
  //         city: result.city,
  //       });
  //       setFormData((prev) => ({
  //         ...prev,
  //         country: result.country,
  //         country_code: result.country_code,
  //         city: result.city,
  //       }));
  //       trackEvent("location_detected", {
  //         event_category: "Signup",
  //         country: result.country,
  //         country_code: result.country_code,
  //         has_city: !!result.city,
  //       });
  //     } else {
  //       console.warn("[Signup] requestGeolocation returned null");
  //     }
  //     console.log("[Signup] Moving to profile step");
  //     setStep("profile");
  //   } catch (error) {
  //     console.error("[Signup] Error in handleLocationPermission:", error);
  //     trackEvent("location_error", {
  //       event_category: "Signup",
  //       error_type: error instanceof Error ? error.message : "unknown",
  //     });
  //     // Продолжаем процесс даже если геолокация не удалась
  //     setStep("profile");
  //   }
  // };

  const handleLocationSubmit = () => {
    // Проверяем, что страна выбрана
    if (!formData.country_code || !formData.country) {
      alert("Please select a country");
      return;
    }
    trackEvent("location_entered_manually", {
      event_category: "Signup",
      country: formData.country,
      country_code: formData.country_code,
      has_city: !!formData.city,
    });
    setStep("profile");
  };

  const filteredCountries = countries.filter((c: Country) =>
    c.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  const filteredCities = formData.country_code
    ? MAJOR_CITIES.filter((city) => {
        const matchesCountry = city.countryCode === formData.country_code;
        const matchesQuery = city.name.toLowerCase().includes(citySearchQuery.toLowerCase());
        return matchesCountry && matchesQuery;
      })
    : [];

  const handleSelectCountry = (country: Country) => {
    setFormData((prev) => ({
      ...prev,
      country: country.name,
      country_code: country.code,
      city: "", // Сбрасываем город при смене страны
    }));
    setCountrySearchQuery("");
    setIsCountryDropdownOpen(false);
    setCitySearchQuery("");
    setIsCityDropdownOpen(false);
  };

  const handleSelectCity = (cityName: string) => {
    setFormData((prev) => ({
      ...prev,
      city: cityName,
    }));
    setCitySearchQuery(cityName);
    setIsCityDropdownOpen(false);
  };

  const handleCountryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredCountries.length > 0) {
      handleSelectCountry(filteredCountries[0]);
    }
  };

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredCities.length > 0) {
      handleSelectCity(filteredCities[0].name);
    }
  };

  const handleProfileSubmit = async () => {
    setIsLoading(true);
    try {
      // Сохраняем профиль в Supabase
      const response = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: formData.country || null,
          country_code: formData.country_code || null,
          city: formData.city || null,
          bio: formData.bio.trim() || null,
          role: formData.role || null,
          interest_slugs: formData.interests,
          is_open_to_meet: formData.isOpenToMeet,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      trackEvent("signup_profile_step_complete", {
        event_category: "Signup",
        has_bio: !!formData.bio,
        has_role: !!formData.role,
        interests_count: formData.interests.length,
        is_open_to_meet: formData.isOpenToMeet,
        has_invite: !!inviteCode,
      });

      // Переходим к шагу навыков
      setStep("skills");
    } catch (error) {
      // Можно добавить отображение ошибки пользователю
      alert(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkillsSubmit = async (skip: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skill_slugs: skip ? [] : formData.skill_slugs,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save skills");
      }

      trackEvent("signup_success", {
        event_category: "Authentication",
        has_bio: !!formData.bio,
        has_role: !!formData.role,
        interests_count: formData.interests.length,
        skills_count: skip ? 0 : formData.skill_slugs.length,
        is_open_to_meet: formData.isOpenToMeet,
        has_invite: !!inviteCode,
        skills_skipped: skip,
      });

      setStep("complete");

      if (redirectTo) {
        setTimeout(() => {
          router.push(redirectTo);
        }, 2000);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save skills");
    } finally {
      setIsLoading(false);
    }
  };

  const roles = USER_ROLE_OPTIONS;
  const interests = INTEREST_DEFINITIONS;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 flex items-center justify-center animated-bg px-4 py-12">
        {/* Background effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-secondary)]/10 rounded-full blur-3xl" />

        <Card variant="bordered" className="w-full max-w-md p-8 relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.svg"
              alt="SolPoint"
              width={60}
              height={60}
            />
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {["twitter", "location", "profile", "skills", "complete"].map((s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  ["twitter", "location", "profile", "skills", "complete"].indexOf(step) >= i
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--color-surface-border)]"
                }`}
              />
            ))}
          </div>

          {/* Message from callback */}
          {message && (
            <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-2 text-blue-500">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium">{decodeURIComponent(message)}</p>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Twitter Auth */}
            {step === "twitter" && (
              <motion.div
                key="twitter"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-2">
                  Join SolPoint
                </h1>
                <p className="text-center text-[var(--color-text-secondary)] mb-8">
                  Connect with the global Solana community
                </p>

                <Button
                  onClick={handleTwitterSignup}
                  isLoading={isLoading}
                  className="w-full mb-4 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white"
                  size="lg"
                >
                  <Twitter className="w-5 h-5 mr-2" />
                  Sign up with Twitter
                </Button>

                <p className="text-xs text-center text-[var(--color-text-muted)] mb-6">
                  We&apos;ll import your name, handle, and profile picture.
                  We never post without permission.
                </p>

                <p className="text-center text-[var(--color-text-secondary)]">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </motion.div>
            )}

            {/* Step 2: Location Entry */}
            {step === "location" && (
              <motion.div
                key="location"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-[var(--color-primary)]" />
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-2">
                  Enter Your Location
                </h1>
                <p className="text-center text-[var(--color-text-secondary)] mb-6">
                  Help others find you on the map
                </p>

                <div className="space-y-4">
                  {/* Country Selection */}
                  <div>
                    <label className="block text-sm text-[var(--color-text-muted)] mb-2">
                      Country *
                    </label>
                    <div className="relative" ref={countryDropdownRef}>
                      <Input
                        placeholder={formData.country || "Select country"}
                        icon={<Search className="w-4 h-4" />}
                        value={countrySearchQuery}
                        onChange={(e) => {
                          setCountrySearchQuery(e.target.value);
                          setIsCountryDropdownOpen(true);
                        }}
                        onFocus={() => setIsCountryDropdownOpen(true)}
                        onKeyDown={handleCountryKeyDown}
                      />

                      {isCountryDropdownOpen && filteredCountries.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredCountries.map((country: Country) => (
                            <button
                              key={country.code}
                              onClick={() => handleSelectCountry(country)}
                              className={cn(
                                "w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[var(--color-surface-border)] transition-colors",
                                formData.country_code === country.code && "bg-[var(--color-primary)]/10"
                              )}
                            >
                              <span
                                className={cn(
                                  "text-sm",
                                  formData.country_code === country.code
                                    ? "text-[var(--color-primary)] font-medium"
                                    : "text-[var(--color-text-primary)]"
                                )}
                              >
                                {country.name}
                              </span>
                              {formData.country_code === country.code && (
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
                    <label className="block text-sm text-[var(--color-text-muted)] mb-2">
                      City (optional)
                    </label>
                    <div className="relative" ref={cityDropdownRef}>
                      <Input
                        placeholder="Enter city name"
                        icon={<Search className="w-4 h-4" />}
                        value={citySearchQuery}
                        onChange={(e) => {
                          setCitySearchQuery(e.target.value);
                          setIsCityDropdownOpen(true);
                          setFormData((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }));
                        }}
                        onFocus={() => {
                          if (formData.country_code) {
                            setIsCityDropdownOpen(true);
                          }
                        }}
                        onKeyDown={handleCityKeyDown}
                        disabled={!formData.country_code}
                      />

                      {isCityDropdownOpen && filteredCities.length > 0 && formData.country_code && (
                        <div className="absolute z-50 w-full mt-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredCities.map((city) => (
                            <button
                              key={`${city.name}-${city.countryCode}`}
                              onClick={() => handleSelectCity(city.name)}
                              className={cn(
                                "w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[var(--color-surface-border)] transition-colors",
                                formData.city === city.name && "bg-[var(--color-primary)]/10"
                              )}
                            >
                              <span
                                className={cn(
                                  "text-sm",
                                  formData.city === city.name
                                    ? "text-[var(--color-primary)] font-medium"
                                    : "text-[var(--color-text-primary)]"
                                )}
                              >
                                {city.name}
                              </span>
                              {formData.city === city.name && (
                                <Check className="w-4 h-4 text-[var(--color-primary)]" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-hover)] rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-[var(--color-primary)] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Country is visible to everyone. City is visible only to PRO users.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleLocationSubmit}
                    className="w-full"
                    size="lg"
                    disabled={!formData.country_code}
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Profile Setup */}
            {step === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-2">
                  Complete Your Profile
                </h1>
                <p className="text-center text-[var(--color-text-secondary)] mb-6">
                  Tell the community about yourself
                </p>

                <div className="space-y-4">
                  {/* Bio */}
                  <div>
                    <label className="block text-sm text-[var(--color-text-muted)] mb-1">
                      Bio{" "}
                      <span className="text-[var(--color-text-muted)]">
                        ({formData.bio.length}/150)
                      </span>
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          bio: e.target.value.slice(0, 150),
                        }))
                      }
                      placeholder="Tell us about yourself..."
                      className="w-full h-24 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm text-[var(--color-text-muted)] mb-2">
                      I am a... (optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((role) => (
                        <button
                          key={role.value}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              role: prev.role === role.value ? "" : role.value,
                            }))
                          }
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            formData.role === role.value
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                              : "border-[var(--color-surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="block text-sm text-[var(--color-text-muted)] mb-2">
                      Interests (optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {interests.map((interest) => {
                        const selected = formData.interests.includes(interest.slug);
                        return (
                          <button
                            key={interest.slug}
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                interests: selected
                                  ? prev.interests.filter((slug) => slug !== interest.slug)
                                  : [...prev.interests, interest.slug],
                              }))
                            }
                            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                              selected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                                : "border-[var(--color-surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                            }`}
                          >
                            {interest.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Open to meet */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      Open to meet IRL
                    </span>
                    <button
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          isOpenToMeet: !prev.isOpenToMeet,
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        formData.isOpenToMeet
                          ? "bg-[var(--color-primary)]"
                          : "bg-[var(--color-surface-border)]"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          formData.isOpenToMeet ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </label>

                  <Button
                    onClick={handleProfileSubmit}
                    isLoading={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Skills */}
            {step === "skills" && (
              <motion.div
                key="skills"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-2">
                  Add Your Skills
                </h1>
                <p className="text-center text-[var(--color-text-secondary)] mb-6">
                  Pick up to {MAX_PROFILE_SKILLS} tags so people can find you faster
                </p>

                <div className="space-y-4">
                  <SkillTagPicker
                    categories={skillCategories}
                    items={skillDictionary}
                    selectedSlugs={formData.skill_slugs}
                    onChange={(next) =>
                      setFormData((prev) => ({
                        ...prev,
                        skill_slugs: next,
                      }))
                    }
                    maxSelected={MAX_PROFILE_SKILLS}
                    searchPlaceholder="Search skills"
                    disabled={isLoading}
                  />

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      onClick={() => handleSkillsSubmit(false)}
                      isLoading={isLoading}
                      className="w-full"
                      size="lg"
                    >
                      Continue
                    </Button>
                    <Button
                      onClick={() => handleSkillsSubmit(true)}
                      variant="outline"
                      className="w-full"
                      size="lg"
                      disabled={isLoading}
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Complete */}
            {step === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-[var(--color-primary)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                  You&apos;re all set!
                </h1>
                <p className="text-[var(--color-text-secondary)] mb-8">
                  Welcome to the SolPoint community
                </p>

                <div className="space-y-3">
                  {redirectTo ? (
                    <Button 
                      onClick={() => router.push(redirectTo)}
                      className="w-full" 
                      size="lg"
                    >
                      Continue to Activation
                    </Button>
                  ) : (
                    <>
                      <Button asChild className="w-full" size="lg">
                        <Link href="/map">Explore the Map</Link>
                      </Button>
                      <Button variant="outline" asChild className="w-full">
                        <Link href="/profile">View My Profile</Link>
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </main>
      <Footer />
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <main className="min-h-screen pt-16 flex items-center justify-center animated-bg px-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
          </div>
        </main>
        <Footer />
      </>
    }>
      <SignupPageContent />
    </Suspense>
  );
}
