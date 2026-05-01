"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { SkillTagPicker } from "@/components/ui/skill-tag-picker";
import { Header, Footer } from "@/components/layout";
import { Twitter, MapPin, Globe, AlertCircle, Loader2, Search, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/use-auth";
// import { useGeolocation } from "@/hooks/use-geolocation";
import { trackEvent } from "@/lib/analytics";
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

const kodeMonoStyle = {
  fontFamily: "var(--font-kode-mono), monospace",
} as const;

const MAX_INTERESTS = 4;

const selectTriggerClass =
  "signup-field flex h-11 w-full items-center justify-between border border-[#2A2A2A] bg-[#0E0F11] px-3 pr-2 text-left text-[14px] font-bold leading-none tracking-[-0.05em] text-white transition-colors hover:border-[#3A3A3A] active:border-white focus-visible:border-white focus-visible:outline-none focus-visible:ring-0";

const selectPopupClass =
  "absolute left-0 right-0 top-full z-50 mt-1 border border-[#2A2A2A] bg-[#0E0F11] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)]";

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
            ((user as User & { skill_slugs?: string[] }).skill_slugs || []).slice(0, MAX_PROFILE_SKILLS);
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
          skill_slugs: skip ? [] : formData.skill_slugs.slice(0, MAX_PROFILE_SKILLS),
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
        skills_count: skip ? 0 : Math.min(formData.skill_slugs.length, MAX_PROFILE_SKILLS),
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
  const flowSteps: Step[] = ["twitter", "location", "profile", "skills", "complete"];
  const stepTitles: Record<Step, string> = {
    twitter: "Account",
    location: "Location",
    profile: "Profile",
    skills: "Skills",
    complete: "Done",
  };
  const activeStepIndex = flowSteps.indexOf(step);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-16 pt-[90px]" style={kodeMonoStyle}>
        <section className="mx-auto w-full max-w-[1440px] px-4 md:px-10">
          <div className="mx-auto w-full max-w-[560px] border border-[#2A2A2A] bg-[#101319] px-5 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8">
            <div className="mb-7 flex items-center justify-center gap-3">
              <div className="relative h-[58px] w-[58px] shrink-0">
                <Image src="/main-logo.svg" alt="SolPoint" fill className="object-contain" priority />
              </div>
              <span className="text-[28px] font-bold leading-none text-white">SolPoint</span>
            </div>

            <div className="mb-7">
              <div className="flex items-center gap-2">
                {flowSteps.map((flowStep, index) => (
                  <div key={flowStep} className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors",
                        activeStepIndex >= index
                          ? "border-[#14f195] bg-[#14f195] text-black"
                          : "border-white/25 bg-transparent text-white/60"
                      )}
                    >
                      {index + 1}
                    </span>
                    {index < flowSteps.length - 1 ? (
                      <span
                        className={cn(
                          "h-px w-full",
                          activeStepIndex > index ? "bg-[#14f195]/80" : "bg-white/15"
                        )}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[13px] font-medium tracking-wide text-white/70">
                Step: {stepTitles[step]}
              </p>
            </div>

            {message && (
              <div className="mb-5 border border-blue-400/40 bg-blue-500/10 px-4 py-3">
                <div className="flex items-start gap-2 text-blue-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-[13px] font-semibold leading-snug">{decodeURIComponent(message)}</p>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === "twitter" && (
                <motion.div
                  key="twitter"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h1 className="text-center text-[30px] font-bold leading-none text-white">Join SolPoint</h1>
                  <p className="mx-auto mt-3 max-w-[430px] text-center text-[15px] font-medium leading-snug text-white/70">
                    Connect with the global Solana community and start meeting the right people.
                  </p>

                  <Button
                    onClick={handleTwitterSignup}
                    isLoading={isLoading}
                    size="lg"
                    className="mt-6 h-[49px] w-full rounded-[7px] border border-white bg-white px-4 text-[18px] font-bold leading-none tracking-[-0.03em] text-black hover:bg-white/90"
                    style={kodeMonoStyle}
                  >
                    <Twitter className="mr-2 h-5 w-5" />
                    Sign up with Twitter
                  </Button>

                  <p className="mt-6 text-center text-[13px] font-medium text-white/70">
                    Already have an account?{" "}
                    <Link
                      href={
                        redirectTo
                          ? `/login?redirect_to=${encodeURIComponent(redirectTo)}`
                          : "/login"
                      }
                      className="text-white underline underline-offset-2 hover:text-white/80"
                    >
                      Log in
                    </Link>
                  </p>
                </motion.div>
              )}

              {step === "location" && (
                <motion.div
                  key="location"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#14f195]/40 bg-[#14f195]/15">
                    <MapPin className="h-7 w-7 text-[#14f195]" />
                  </div>

                  <h1 className="text-center text-[30px] font-bold leading-none text-white">Enter your location</h1>
                  <p className="mx-auto mt-3 max-w-[430px] text-center text-[15px] font-medium leading-snug text-white/70">
                    Help others discover you on the map and connect faster.
                  </p>

                  <div className="mt-6 space-y-4">
                    <div className="relative" ref={countryDropdownRef}>
                      <label className="mb-2 block text-[13px] font-medium text-white/75">Country *</label>
                      <button
                        type="button"
                        className={selectTriggerClass}
                        onClick={() => setIsCountryDropdownOpen((open) => !open)}
                      >
                        <span className={cn("truncate", !formData.country && "text-white/55")}>
                          {formData.country || "choose country"}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-white/70 transition-transform",
                            isCountryDropdownOpen && "rotate-180"
                          )}
                        />
                      </button>

                      {isCountryDropdownOpen ? (
                        <div className={selectPopupClass}>
                          <div className="mb-2 flex h-9 items-center gap-2 border border-[#2A2A2A] bg-black px-2 transition-colors focus-within:border-white">
                            <Search className="h-3.5 w-3.5 shrink-0 text-white/55" />
                            <input
                              autoFocus
                              value={countrySearchQuery}
                              onChange={(event) => setCountrySearchQuery(event.target.value)}
                              onKeyDown={handleCountryKeyDown}
                              placeholder="find your country"
                              className="signup-field w-full bg-transparent text-[12px] font-bold text-white placeholder:text-white/45 focus:outline-none"
                            />
                          </div>
                          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                            {filteredCountries.length > 0 ? (
                              filteredCountries.map((country: Country) => (
                                <button
                                  key={country.code}
                                  type="button"
                                  className={cn(
                                    "flex w-full items-center justify-between px-2 py-2 text-left text-[12px] font-bold transition-colors",
                                    formData.country_code === country.code
                                      ? "bg-[#14f195]/15 text-[#14f195]"
                                      : "text-white hover:bg-[#1A1C20] hover:text-[#14f195]"
                                  )}
                                  onClick={() => handleSelectCountry(country)}
                                >
                                  <span className="truncate">{country.name}</span>
                                  <span
                                    className={cn(
                                      "h-3.5 w-3.5 shrink-0 border",
                                      formData.country_code === country.code
                                        ? "border-white bg-white"
                                        : "border-white/30"
                                    )}
                                  />
                                </button>
                              ))
                            ) : (
                              <p className="px-2 py-2 text-[12px] text-white/50">No countries found.</p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="relative" ref={cityDropdownRef}>
                      <label className="mb-2 block text-[13px] font-medium text-white/75">City (optional)</label>
                      <div
                        className={cn(
                          "flex h-11 items-center gap-2 border border-[#2A2A2A] bg-[#0E0F11] px-3 transition-colors",
                          formData.country_code
                            ? "focus-within:border-white"
                            : "cursor-not-allowed opacity-55"
                        )}
                      >
                        <Search className="h-3.5 w-3.5 shrink-0 text-white/55" />
                        <input
                          value={citySearchQuery}
                          onChange={(event) => {
                            setCitySearchQuery(event.target.value);
                            setIsCityDropdownOpen(true);
                            setFormData((prev) => ({
                              ...prev,
                              city: event.target.value,
                            }));
                          }}
                          onFocus={() => {
                            if (formData.country_code) {
                              setIsCityDropdownOpen(true);
                            }
                          }}
                          onKeyDown={handleCityKeyDown}
                          placeholder={formData.country_code ? "type your city" : "choose country first"}
                          disabled={!formData.country_code}
                          className="signup-field w-full bg-transparent text-[12px] font-bold text-white placeholder:text-white/45 focus:outline-none"
                        />
                      </div>

                      {isCityDropdownOpen && formData.country_code ? (
                        <div className={selectPopupClass}>
                          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                            {filteredCities.length > 0 ? (
                              filteredCities.map((city) => (
                                <button
                                  key={`${city.name}-${city.countryCode}`}
                                  type="button"
                                  className={cn(
                                    "flex w-full items-center justify-between px-2 py-2 text-left text-[12px] font-bold transition-colors",
                                    formData.city === city.name
                                      ? "bg-[#14f195]/15 text-[#14f195]"
                                      : "text-white hover:bg-[#1A1C20] hover:text-[#14f195]"
                                  )}
                                  onClick={() => handleSelectCity(city.name)}
                                >
                                  <span className="truncate">{city.name}</span>
                                  <span
                                    className={cn(
                                      "h-3.5 w-3.5 shrink-0 border",
                                      formData.city === city.name
                                        ? "border-white bg-white"
                                        : "border-white/30"
                                    )}
                                  />
                                </button>
                              ))
                            ) : (
                              <p className="px-2 py-2 text-[12px] text-white/50">
                                No suggestions. You can type your city manually.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <Button
                      onClick={handleLocationSubmit}
                      size="lg"
                      disabled={!formData.country_code}
                      className="h-[49px] w-full rounded-[7px] border border-white bg-white px-4 text-[18px] font-bold leading-none tracking-[-0.03em] text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                      style={kodeMonoStyle}
                    >
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h1 className="text-center text-[30px] font-bold leading-none text-white">Complete your profile</h1>
                  <p className="mx-auto mt-3 max-w-[430px] text-center text-[15px] font-medium leading-snug text-white/70">
                    Tell the community who you are and what you&apos;re into.
                  </p>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="mb-2 block text-[13px] font-medium text-white/75">
                        Bio <span className="text-white/45">({formData.bio.length}/150)</span>
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
                        className="signup-field h-24 w-full resize-none rounded-[4px] border border-[#5e5e5e] bg-black px-2.5 py-2 text-[13px] font-medium leading-snug text-white placeholder:text-[#a4a7ac] focus:border-white focus:outline-none focus-visible:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[13px] font-medium text-white/75">I am a... (optional)</label>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {roles.map((role) => {
                          const isSelected = formData.role === role.value;
                          return (
                            <button
                              key={role.value}
                              type="button"
                              className="group flex w-full items-center justify-between gap-3 text-left"
                              aria-pressed={isSelected}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  role: prev.role === role.value ? "" : role.value,
                                }))
                              }
                            >
                              <span className="text-[12px] font-bold text-white">{role.label}</span>
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "grid h-[13px] w-[13px] place-items-center rounded-[2px] border",
                                  "border-[#313131] bg-[#0F0F0F]",
                                  "group-hover:border-white/40"
                                )}
                                style={{ borderWidth: 1 }}
                              >
                                {isSelected ? <span className="h-[7px] w-[7px] rounded-[1px] bg-white" /> : null}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="block text-[13px] font-medium text-white/75">Interests (optional)</label>
                        <span className="text-[11px] text-white/60">
                          {formData.interests.length}/{MAX_INTERESTS}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {interests.map((interest) => {
                          const isSelected = formData.interests.includes(interest.slug);
                          const limitReached = !isSelected && formData.interests.length >= MAX_INTERESTS;
                          return (
                            <button
                              key={interest.slug}
                              type="button"
                              className={cn(
                                "group flex w-full items-center justify-between gap-3 text-left transition-opacity",
                                limitReached && "cursor-not-allowed opacity-45"
                              )}
                              aria-pressed={isSelected}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  interests: prev.interests.includes(interest.slug)
                                    ? prev.interests.filter((slug) => slug !== interest.slug)
                                    : prev.interests.length >= MAX_INTERESTS
                                      ? prev.interests
                                      : [...prev.interests, interest.slug],
                                }))
                              }
                              disabled={limitReached}
                            >
                              <span className="text-[12px] font-bold text-white">{interest.name}</span>
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "grid h-[13px] w-[13px] place-items-center rounded-[2px] border",
                                  "border-[#313131] bg-[#0F0F0F]",
                                  !limitReached && "group-hover:border-white/40"
                                )}
                                style={{ borderWidth: 1 }}
                              >
                                {isSelected ? <span className="h-[7px] w-[7px] rounded-[1px] bg-white" /> : null}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-[11px] text-white/50">You can choose up to {MAX_INTERESTS} interests.</p>
                    </div>

                    <Button
                      onClick={handleProfileSubmit}
                      isLoading={isLoading}
                      size="lg"
                      className="h-[49px] w-full rounded-[7px] border border-white bg-white px-4 text-[18px] font-bold leading-none tracking-[-0.03em] text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                      style={kodeMonoStyle}
                    >
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === "skills" && (
                <motion.div
                  key="skills"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h1 className="text-center text-[30px] font-bold leading-none text-white">Add your skills</h1>
                  <p className="mx-auto mt-3 max-w-[430px] text-center text-[15px] font-medium leading-snug text-white/70">
                    Pick up to {MAX_PROFILE_SKILLS} tags so people can find you faster.
                  </p>

                  <div className="mt-6 space-y-4">
                    <div className="border border-[#2A2A2A] bg-[#0E0F11] p-3">
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
                          searchPlaceholder="Find skills"
                          variant="toggles"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        onClick={() => handleSkillsSubmit(false)}
                        isLoading={isLoading}
                        size="lg"
                        className="h-[49px] w-full rounded-[7px] border border-white bg-white px-4 text-[18px] font-bold leading-none tracking-[-0.03em] text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                        style={kodeMonoStyle}
                      >
                        Continue
                      </Button>
                      <Button
                        onClick={() => handleSkillsSubmit(true)}
                        size="lg"
                        disabled={isLoading}
                        className="h-[49px] w-full rounded-[7px] border border-white/35 bg-transparent px-4 text-[18px] font-bold leading-none tracking-[-0.03em] text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        style={kodeMonoStyle}
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === "complete" && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#14f195]/50 bg-[#14f195]/15">
                    <svg
                      className="h-10 w-10 text-[#14f195]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <h1 className="text-[30px] font-bold leading-none text-white">You&apos;re all set!</h1>
                  <p className="mx-auto mt-3 max-w-[420px] text-[15px] font-medium leading-snug text-white/70">
                    Welcome to the SolPoint community.
                  </p>

                  <div className="mt-8 space-y-3">
                    {redirectTo ? (
                      <Button
                        onClick={() => router.push(redirectTo)}
                        size="lg"
                        className="h-[49px] w-full rounded-[7px] border border-white bg-white px-4 text-[18px] font-bold leading-none tracking-[-0.03em] text-black hover:bg-white/90"
                        style={kodeMonoStyle}
                      >
                        Continue to Activation
                      </Button>
                    ) : (
                      <>
                        <Button
                          asChild
                          size="lg"
                          className="h-[49px] w-full rounded-[7px] border border-white bg-white px-4 text-[18px] font-bold leading-none tracking-[-0.03em] text-black hover:bg-white/90"
                          style={kodeMonoStyle}
                        >
                          <Link href="/map">Explore the Map</Link>
                        </Button>
                        <Link
                          href="/profile"
                          className="group inline-flex h-[49px] w-full items-stretch rounded-[7px] p-px"
                          style={{ background: "linear-gradient(90deg, #9b45fe 0%, #00f58d 100%)" }}
                        >
                          <span className="flex flex-1 items-center justify-center rounded-[6px] bg-black px-4 text-[18px] font-bold leading-none tracking-[-0.03em] text-white transition-colors group-hover:bg-transparent group-hover:text-black">
                            View my profile
                          </span>
                        </Link>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
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
        <main className="min-h-screen bg-black pt-[90px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#14f195]" />
          </div>
        </main>
        <Footer />
      </>
    }>
      <SignupPageContent />
    </Suspense>
  );
}
