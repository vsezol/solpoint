"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Card, Input, Badge } from "@/components/ui";
import { Header, Footer } from "@/components/layout";
import { Twitter, MapPin, Shield, Globe } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/use-auth";

type Step = "twitter" | "location" | "profile" | "complete";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const stepFromUrl = searchParams.get("step");
  const inviteCode = searchParams.get("invite");
  
  const [step, setStep] = useState<Step>(
    (stepFromUrl === "location" ? "location" : 
     stepFromUrl === "profile" ? "profile" : 
     "twitter") as Step
  );
  const [isLoading, setIsLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    country: "",
    city: "" as string | null,
    bio: "",
    role: "",
    isOpenToMeet: false,
  });

  // Сохраняем invite код в localStorage для использования после регистрации
  useEffect(() => {
    if (inviteCode) {
      localStorage.setItem("inviteCode", inviteCode);
    }
  }, [inviteCode]);

  // Загружаем данные профиля при загрузке, если пользователь авторизован
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      // Если пользователь уже авторизован и профиль заполнен, редиректим на профиль
      // НО только если нет invite кода (чтобы не пропустить обработку invite)
      if (user.country && user.country !== "Unknown" && step === "twitter" && !inviteCode) {
        router.push("/profile");
        return;
      }
      
      // Загружаем данные профиля в форму, если они есть
      // НО не перезаписываем данные, которые уже были установлены через геолокацию
      if (user.country || user.city || user.bio || user.role) {
        setFormData((prev) => {
          // Если в formData уже есть страна (не "Unknown" и не пустая), не перезаписываем её
          // Это означает, что данные были установлены через геолокацию
          const shouldKeepCountry = prev.country && prev.country !== "Unknown" && prev.country !== "";
          const shouldKeepCity = prev.city && prev.city !== "";
          
          return {
            ...prev,
            // Сохраняем страну из геолокации, если она уже установлена
            country: shouldKeepCountry ? prev.country : (user.country || prev.country || ""),
            // Сохраняем город из геолокации, если он уже установлен
            city: shouldKeepCity ? prev.city : (user.city || prev.city || ""),
            // Био и роль можно загружать из БД, так как они не устанавливаются через геолокацию
            bio: user.bio || prev.bio || "",
            role: user.role || prev.role || "",
            isOpenToMeet: user.is_open_to_meet !== undefined ? user.is_open_to_meet : prev.isOpenToMeet,
          };
        });
      }
      
      // Если авторизован, но на шаге twitter, переходим к шагу location
      // НО только если нет invite кода в URL (чтобы не пропустить шаг Twitter при регистрации по invite)
      // Если есть invite код, пользователь должен видеть шаг Twitter, чтобы понять что он зарегистрировался
      if (step === "twitter" && (!user.country || user.country === "Unknown") && !inviteCode) {
        setStep("location");
      }
    }
  }, [authLoading, isAuthenticated, user, router, step, inviteCode]);

  const handleTwitterSignup = async () => {
    setIsLoading(true);
    // Редиректим на API route для инициации Twitter OAuth
    // После успешной авторизации вернемся на /signup для продолжения процесса
    // Передаем invite код через redirect_to, если он есть
    const redirectTo = inviteCode 
      ? `/signup?invite=${encodeURIComponent(inviteCode)}`
      : "/signup";
    
    window.location.href = `/api/auth/twitter?redirect_to=${encodeURIComponent(redirectTo)}`;
  };

 

  const handleLocationPermission = async (allow: boolean) => {
    setLocationPermission(allow);
    if (allow) {
      // Request geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              // Используем координаты из браузера для reverse geocoding
              // Округляем до 2 знаков для снижения точности (~1 км) - достаточно для определения города
              const { latitude, longitude } = position.coords;
              const roundedLat = Math.round(latitude * 100) / 100;
              const roundedLng = Math.round(longitude * 100) / 100;
              
              // Вызываем API для преобразования координат в страну/город
              const response = await fetch(
                `/api/geolocation/reverse?latitude=${roundedLat}&longitude=${roundedLng}`
              );
              
              if (response.ok) {
                const data = await response.json();
                setFormData((prev) => ({
                  ...prev,
                  country: data.country || "Unknown",
                  city: data.city || null,
                }));
              } else {
                // Если reverse geocoding не сработал, используем IP-based fallback
                await fetchLocationFromIP();
              }
            } catch (error) {
              // Fallback на IP-based геолокацию
              await fetchLocationFromIP();
            }
            setStep("profile");
          },
          async () => {
            // Geolocation denied, use IP-based
            await fetchLocationFromIP();
            setStep("profile");
          },
          {
            enableHighAccuracy: false, // Не использовать GPS, только WiFi/сеть (точность ~1-2 км)
            timeout: 10000, // Таймаут 10 секунд
            maximumAge: 60000 // Использовать кешированные данные до 1 минуты
          }
        );
      } else {
        // Браузер не поддерживает geolocation, используем IP-based
        await fetchLocationFromIP();
        setStep("profile");
      }
    } else {
      // Пользователь отклонил запрос, используем IP-based
      await fetchLocationFromIP();
      setStep("profile");
    }
  };

  // Функция для получения локации по IP (fallback)
  const fetchLocationFromIP = async () => {
    try {
      // Используем бесплатный IP geolocation API
      const response = await fetch("https://ipapi.co/json/");
      
      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({
          ...prev,
          country: data.country_name || "Unknown",
          city: data.city || null,
        }));
      } else {
        // Если и IP-based не сработал, оставляем пустым
        setFormData((prev) => ({
          ...prev,
          country: "Unknown",
          city: null,
        }));
      }
    } catch (error) {
      setFormData((prev) => ({
        ...prev,
        country: "Unknown",
        city: null,
      }));
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
          city: formData.city || null,
          bio: formData.bio.trim() || null,
          role: formData.role || null,
          is_open_to_meet: formData.isOpenToMeet,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      // Переходим к завершающему шагу
      setStep("complete");
    } catch (error) {
      console.error("Error saving profile:", error);
      // Можно добавить отображение ошибки пользователю
      alert(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    { value: "developer", label: "Developer" },
    { value: "trader", label: "Trader" },
    { value: "investor", label: "Investor" },
    { value: "designer", label: "Designer" },
    { value: "founder", label: "Founder" },
    { value: "degen", label: "Degen" },
    { value: "other", label: "Other" },
  ];

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
            {["twitter", "location", "profile", "complete"].map((s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  ["twitter", "location", "profile", "complete"].indexOf(step) >= i
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--color-surface-border)]"
                }`}
              />
            ))}
          </div>

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

            {/* Step 2: Location Permission */}
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
                  Enable Location
                </h1>
                <p className="text-center text-[var(--color-text-secondary)] mb-6">
                  Help others find you on the map
                </p>

                <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3 mb-3">
                    <Shield className="w-5 h-5 text-[var(--color-primary)] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        Your privacy is protected
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        We only store country and city — never exact coordinates.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-[var(--color-primary)] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        Country is public, city is VIP-only
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Free users see your country. VIP users can see your city.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => handleLocationPermission(true)}
                    className="w-full"
                    size="lg"
                  >
                    <MapPin className="w-5 h-5 mr-2" />
                    Allow Location Access
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleLocationPermission(false)}
                    className="w-full"
                  >
                    Skip for now
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
                  {/* Location fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-[var(--color-text-muted)] mb-1">
                        Country
                      </label>
                      <Input
                        value={formData.country}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, country: e.target.value }))
                        }
                        placeholder="Your country"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-muted)] mb-1">
                        City
                      </label>
                      <Input
                        value={formData.city || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, city: e.target.value || null }))
                        }
                        placeholder="Your city"
                      />
                    </div>
                  </div>

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
                    Complete Setup
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Complete */}
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
                  <Button asChild className="w-full" size="lg">
                    <Link href="/map">Explore the Map</Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/profile">View My Profile</Link>
                  </Button>
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

