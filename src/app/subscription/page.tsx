"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Header, Footer } from "@/components/layout";
import { Button, Card, Badge, Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent } from "@/components/ui";
import { getMapMarkers } from "@/lib/api/map";
import type { MapMarker, MapFilters } from "@/types";

// Dynamic imports to avoid SSR issues with maplibre-gl
const WaterLayer = dynamic(
  () => import("../mapcn/water-layer").then((mod) => ({ default: mod.WaterLayer })),
  { ssr: false }
);

const CountriesLayer = dynamic(
  () => import("../mapcn/countries-layer").then((mod) => ({ default: mod.CountriesLayer })),
  { ssr: false }
);

const MapMarkersLayer = dynamic(
  () => import("../mapcn/markers-layer").then((mod) => ({ default: mod.MapMarkersLayer })),
  { ssr: false }
);

// Dynamic import for map component to avoid SSR issues with MapLibre GL
const Map = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.Map),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-secondary)]">Loading map...</p>
        </div>
      </div>
    ),
  }
);

const MapControls = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.MapControls),
  {
    ssr: false,
  }
);
import {
  Check,
  MapPin,
  MessageCircle,
  Wallet,
  Shield,
  Loader2,
  Copy,
  CheckCircle2,
  Eye,
  Wrench,
  Lock,
  Star,
  Compass,
  UserPlus,
  AlertCircle,
  Zap,
  Users,
  ChevronDown,
  Calendar,
  X,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { Plan, Subscription } from "@/types";
import { SolanaPaymentButton } from "@/components/subscription/solana-payment-button";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

const freePlanFeatures = [
  { text: "See users on map by country", included: true },
  { text: "Browse hubs, communities, projects", included: true },
  { text: "See profiles of hubs, communities, projects", included: true },
  { text: "View cards and public info", included: true },
  { text: "View user profiles", included: false },
  { text: "Message users", included: false },
  { text: "City-level access", included: false },
  { text: "Create hubs or events", included: false },
];

const proPlanFeatures = [
  { text: "Everything in Basic", included: true },
  { text: "Full user profiles & real identities", included: true },
  { text: "Direct messaging", included: true },
  { text: "City & role filters", included: true },
  { text: "Create hubs, projects, events", included: true },
  { text: "Access to private events", included: true },
  { text: "Gold marker + verified badges", included: true },
  { text: "Priority access to new features", included: true },
];

const mainAdvantages = [
  {
    icon: UserPlus,
    title: "Full People Access",
    description: "See full user profiles and real identities behind hubs, communities, and projects. No previews — full visibility.",
  },
  {
    icon: MessageCircle,
    title: "Direct Messaging",
    description: "Message builders, founders, and organizers directly on SolPoint. Turn discovery into real conversations.",
  },
  {
    icon: MapPin,
    title: "City-Level Access",
    description: "Unlock cities and explore who's active in specific locations. Perfect for travel, relocation, and local networking.",
  },
  {
    icon: Wrench,
    title: "Create & Organize",
    description: "Create hubs, communities, projects, workspaces, and events. Keep SolPoint curated and spam-free.",
  },
  {
    icon: Eye,
    title: "Show All Everywhere",
    description: "Open full lists instead of previews: members of hubs & communities, people attending events, users in your city. See who exactly is there.",
  },
  {
    icon: Compass,
    title: "Role-Based Discovery",
    description: "Filter the map by roles: developers, founders, designers, community leads. Find the right people, not just more people.",
  },
];

const moreBenefits = [
  {
    icon: Lock,
    title: "Private & Closed Events",
    description: "Get access to invite-only and private events. Some opportunities aren't public.",
  },
  {
    icon: Star,
    title: "PRO Map Presence",
    description: "Stand out with a gold marker on the map. Free users appear with a red marker. Visibility matters.",
  },
  {
    icon: Zap,
    title: "Priority Access",
    description: "Get early access to new features and experiments. PRO users see what's coming first.",
  },
  {
    icon: Shield,
    title: "Badges & Reputation",
    description: "Display verified badges: Superteam member, DAO contributor, NFT holder. Build trust and credibility instantly.",
  },
];

const faqItems = [
  {
    question: "How does SolPoint help at conferences like Breakpoint?",
    answer: "Before:\n\nCheck Event's profile to see who's attending, explore profiles, and message people in advance to schedule meetings.\n\nDuring:\n\nAttend the meetings and connections you planned before the event — no awkward cold approaches, no guessing who's relevant.\n\nAfter:\n\nKeep conversations going with direct chats for follow-ups, collaborations, and long-term connections.\n\nSolPoint PRO helps you turn events into planned, meaningful interactions — not random networking.",
  },
  {
    question: "What if I'm just traveling or staying local — do I still need PRO?",
    answer: "Yes. PRO unlocks city-level access (not just country clusters) and role-based filters.\n\nArrive in any city and instantly discover relevant local builders, founders, and community leads — not random profiles.\n\nMessage people directly and start conversations before or the moment you arrive.\n\nFree users only see high-level country clusters.\n\nPRO shows real locals you can actually connect with.",
  },
  {
    question: "What makes SolPoint different from Twitter/Discord searches?",
    answer: "Twitter: Endless scrolling, no precise location/roles, tons of noise.\n\nDiscord: Fragmented servers, hard to find locals or event attendees.\n\nSolPoint: Interactive map with verified builders, city/role filters, event ties, full profiles, and direct messaging.\n\nCurated by PRO users — zero spam.",
  },
  // {
  //   question: "What user data do you collect and store? How private is it?",
  //   answer: "We keep it minimal and under your control.\n\nStored: Only country and city (self-reported for map placement).\n\nIdentity (username, bio, links, badges): 100% optional — shown only if you choose to be public.\n\nNo email/phone/KYC required. Wallet only for payments (never shared).\n\nHide or delete your profile anytime. GDPR-compliant, no data selling.",
  // },
];

function SubscriptionPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [loadingMap, setLoadingMap] = useState(true);
  const isVip = user?.subscription_tier === "vip";
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    pay_address: string;
    pay_amount: string;
    pay_currency: string;
    price_amount: number;
    price_currency: string;
    payment_id: string;
  } | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const [checkingManually, setCheckingManually] = useState(false);
  const [subscriptionActivated, setSubscriptionActivated] = useState(false);
  const [paymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false);
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<Plan | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [currentIntentId, setCurrentIntentId] = useState<string | null>(null);
  const [solanaPaymentStatus, setSolanaPaymentStatus] = useState<string>("");
  const [solanaPaymentError, setSolanaPaymentError] = useState<string>("");
  const [solanaPaymentIntentId, setSolanaPaymentIntentId] = useState<string | null>(null);

  // Проверяем параметры URL для успешной/отмененной оплаты
  useEffect(() => {
    const success = searchParams.get("success");
    const cancelled = searchParams.get("cancelled");
    const activated = searchParams.get("activated");
    
    if (success) {
      // Обновляем подписку после успешной оплаты
      fetchCurrentSubscription();
      trackEvent("subscription_payment_success", {
        event_category: "Subscription",
      });
    } else if (cancelled) {
      trackEvent("subscription_payment_cancelled", {
        event_category: "Subscription",
      });
    } else if (activated) {
      // После активации обновляем профиль, чтобы subscription_tier обновился
      queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
      fetchCurrentSubscription();
      trackEvent("subscription_activated_view", {
        event_category: "Subscription",
      });
    }
  }, [searchParams, queryClient]);

  // Загружаем планы и текущую подписку параллельно
  useEffect(() => {
    // Загружаем планы и подписку параллельно для оптимизации
    if (isAuthenticated && !authLoading) {
      Promise.all([
        fetchPlans(),
        fetchCurrentSubscription(),
      ]);
    } else {
      fetchPlans();
    }
    
    // Вызываем trackEvent асинхронно, чтобы не блокировать загрузку
    setTimeout(() => {
      trackEvent("subscription_page_view", {
        event_category: "Subscription",
      });
    }, 0);
     
  }, [isAuthenticated, authLoading]);

  // Загружаем маркеры для карты (показываем все сущности)
  useEffect(() => {
    async function loadMapMarkers() {
      try {
        setLoadingMap(true);
        const filters: MapFilters = {
          showUsers: true,
          showEvents: true,
          showHubs: true,
          showCommunities: true,
          showWorkspaces: true,
          contentType: "all",
        };
        const markers = await getMapMarkers(filters, user?.id, isVip);
        setMapMarkers(markers);
      } catch (error) {
        console.error("Error loading map markers:", error);
      } finally {
        setLoadingMap(false);
      }
    }

    if (!authLoading) {
      loadMapMarkers();
    }
  }, [user?.id, isVip, authLoading]);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/subscriptions/plans");
      const data = await response.json();
      if (data.plans) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await fetch("/api/subscriptions/current");
      const data = await response.json();
      if (data.subscription) {
        setCurrentSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  };

  const handleUpgrade = async (planId: string) => {
    // Проверяем авторизацию
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      alert("Plan not found");
      return;
    }

    trackEvent("subscription_upgrade_click", {
      event_category: "Subscription",
      plan_name: plan.code,
      price: plan.price,
    });

    // Сбрасываем форму
    setEmail("");
    setEmailError("");
    setCurrentIntentId(null);
    setSolanaPaymentStatus("");
    setSolanaPaymentError("");
    
    // Показываем модальное окно выбора способа оплаты
    setSelectedPaymentPlan(plan);
    setPaymentMethodModalOpen(true);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCreateIntent = async (): Promise<string | null> => {
    if (!selectedPaymentPlan) return null;

    if (!email) {
      setEmailError("Email is required");
      return null;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return null;
    }

    setEmailError("");

    try {
      const response = await fetch("/api/subscriptions/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: selectedPaymentPlan.id,
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create intent");
      }

      const data = await response.json();
      
      // Сохраняем intent_id в localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("subscription_intent_id", data.intent_id);
      }
      
      setCurrentIntentId(data.intent_id);
      return data.intent_id;
    } catch (error) {
      console.error("Error creating intent:", error);
      setEmailError(error instanceof Error ? error.message : "Failed to create intent");
      return null;
    }
  };

  const handleNowPaymentsPayment = async () => {
    if (!selectedPaymentPlan) return;
    
    // Создаем intent перед оплатой
    const intentId = await handleCreateIntent();
    if (!intentId) {
      return; // Ошибка уже показана в handleCreateIntent
    }
    
    setIsLoading(true);
    setSelectedPlan(selectedPaymentPlan.id);
    setPaymentMethodModalOpen(false);

    try {
      trackEvent("subscription_payment_start", {
        event_category: "Subscription",
        plan_name: selectedPaymentPlan.code,
        price: selectedPaymentPlan.price,
      });

      // Создаем платеж через NowPayments с intent_id
      const response = await fetch("/api/subscriptions/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent_id: intentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Если есть детальное сообщение об ошибке, используем его
        if (errorData.message) {
          throw new Error(errorData.message);
        }
        if (errorData.details?.message) {
          throw new Error(errorData.details.message);
        }
        throw new Error(errorData.error || "Failed to create payment");
      }

      const paymentResponse = await response.json();

      // Сохраняем intent_id для проверки статуса
      setCurrentIntentId(intentId);

      // NowPayments возвращает адрес для оплаты (pay_address)
      // Показываем модальное окно с QR-кодом и адресом
      if (paymentResponse.pay_address && paymentResponse.pay_amount) {
        setPaymentData({
          pay_address: paymentResponse.pay_address,
          pay_amount: paymentResponse.pay_amount,
          pay_currency: paymentResponse.pay_currency || "MATIC",
          price_amount: paymentResponse.price_amount,
          price_currency: paymentResponse.price_currency || "USD",
          payment_id: paymentResponse.payment_id,
        });
        setPaymentModalOpen(true);
        
        // Начинаем проверку платежей каждые 5 секунд
        // Проверяем статус intent и редиректим на активацию когда оплата подтверждена
        const checkInterval = setInterval(async () => {
          try {
            if (!intentId) return;
            
            // Проверяем статус intent
            const intentResponse = await fetch(`/api/subscriptions/intent?code=${intentId}`);
            if (intentResponse.ok) {
              const intentData = await intentResponse.json();
              
              // Если intent стал paid, редиректим на активацию
              if (intentData.intent?.status === "paid") {
                clearInterval(checkInterval);
                setPaymentModalOpen(false);
                
                // Редиректим на страницу активации
                window.location.href = `/activate?code=${intentId}`;
              }
            }
          } catch (error) {
            console.error("Error checking intent status:", error);
          }
        }, 5000);
        
        // Останавливаем проверку через 10 минут
        setTimeout(() => {
          clearInterval(checkInterval);
        }, 10 * 60 * 1000);
      } else {
        throw new Error("Payment data not received from payment service");
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      trackEvent("subscription_payment_error", {
        event_category: "Subscription",
        plan_name: selectedPaymentPlan?.code || "unknown",
        error_message: error instanceof Error ? error.message : "unknown",
      });
      alert(
        `Failed to create payment: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleManualCheck = async () => {
    setCheckingManually(true);
    try {
      const response = await fetch("/api/subscriptions/manual-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.activated > 0) {
          alert(`✅ Checked payments: ${data.checked}\n✅ Activated subscriptions: ${data.activated}\n\nSubscription activated! Reloading page...`);
          await fetchCurrentSubscription();
          await fetchPlans();
          window.location.reload();
        } else {
          alert(`Checked payments: ${data.checked}\nActivated subscriptions: ${data.activated}\n\n${data.message || "No completed payments to activate"}`);
          await fetchCurrentSubscription();
        }
      } else {
        alert(`Error: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error manual check:", error);
      alert(`Error checking payments: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setCheckingManually(false);
    }
  };

  // Формируем список планов для отображения
  const displayPlans = [
    {
      id: "free",
      name: "Basic",
      price: 0,
      period: "forever",
      description: "Explore the ecosystem",
      features: freePlanFeatures,
      cta: "Current Plan", // Will be overridden by button logic
      highlighted: false,
      isFree: true,
    },
    ...plans.map((plan) => {
      // Определяем название плана
      let planName = "PRO";
      if (plan.code === "monthly") {
        planName = "PRO Monthly";
      } else if (plan.code === "yearly") {
        planName = "PRO Yearly";
      } else if (plan.code === "pro") {
        planName = "PRO";
      }
      
      // Определяем период
      let period = `${plan.interval_days} days`;
      if (plan.interval_days === 30) {
        period = "month";
      } else if (plan.interval_days === 365) {
        period = "year";
      } else if (plan.interval_days === 31) {
        period = "month";
      }
      
      return {
        id: plan.id,
        name: planName,
        price: plan.price,
        period: period,
        description: "Connect & build smarter",
        features: proPlanFeatures,
        cta: currentSubscription?.plan_id === plan.id ? "Current Plan" : "Upgrade",
        highlighted: true,
        isFree: false,
        plan,
      };
    }),
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen pt-0 md:pt-16 pb-20 md:pb-0 animated-bg">
        {/* Hero - compact and punchy */}
        <section className="relative min-h-[60vh] sm:min-h-[70vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(153,69,255,0.12),transparent_50%),radial-gradient(circle_at_70%_50%,rgba(20,241,149,0.1),transparent_50%)]" />

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
            <p className="text-sm font-medium text-[var(--color-primary)] mb-4 tracking-wider uppercase">
              SolPoint PRO
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              <span className="text-[var(--color-text-primary)]">Network smarter.</span>
              <br />
              <span className="text-gradient">Connect faster.</span>
            </h1>
            <p className="text-base sm:text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-8">
              City-level access, direct messaging, full profiles. Everything you need to build real connections in the Solana ecosystem.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                size="lg"
                className="glow-primary w-full sm:w-auto"
                onClick={() => {
                  trackEvent("hero_cta_pricing", { event_category: "Subscription" });
                  document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                See Plans
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => {
                  trackEvent("hero_cta_explore_map", { event_category: "Subscription" });
                  router.push("/map");
                }}
              >
                Try the Map Free
              </Button>
            </div>
          </div>
        </section>

        {/* PRO Benefits Grid - clean, visual */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {mainAdvantages.map((benefit, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-5 sm:p-6 transition-all duration-500 hover:border-[var(--color-primary)]/30 hover:shadow-lg hover:shadow-[var(--color-primary)]/5"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_0%,rgba(20,241,149,0.06),transparent_60%)]" />
                <div className="relative z-10">
                  <div className="inline-flex p-2.5 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] mb-3">
                    <benefit.icon className="w-5 h-5 text-[var(--color-background)]" strokeWidth={2} />
                  </div>
                  <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1.5">{benefit.title}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Before/After comparison - compact */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="rounded-2xl border border-red-500/20 bg-[var(--color-surface)]/40 p-5 sm:p-6">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Without PRO</h3>
              <ul className="space-y-3">
                {["Random networking at events", "No local contacts when traveling", "Scrolling Twitter for hours"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[var(--color-text-secondary)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-surface)]/40 p-5 sm:p-6">
              <h3 className="text-lg font-bold text-gradient mb-4">With PRO</h3>
              <ul className="space-y-3">
                {["Plan meetings before events", "Instant local connections", "Direct messaging with builders"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[var(--color-text-secondary)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Map preview */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-surface-border)] aspect-[16/9] sm:aspect-[2/1]">
            {loadingMap ? (
              <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface)]">
                <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <Card className="h-full p-0 overflow-hidden mapcn-map-container" style={{ background: "#18E3C5" }}>
                <Map center={[55, 35]} zoom={4}>
                  <WaterLayer />
                  <CountriesLayer landColor="#452D9F" />
                  <MapMarkersLayer markers={mapMarkers} isVip={isVip} isAuthenticated={isAuthenticated} currentUserId={user?.id} />
                  <MapControls showZoom={true} showCompass={true} showLocate={true} showFullscreen={true} />
                </Map>
              </Card>
            )}
          </div>
        </section>

        {/* Pricing Cards */}
        <section id="pricing-section" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 relative z-20">
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-[var(--color-primary)] mb-3 tracking-wider uppercase">Pricing</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
              Choose your plan
            </h2>
          </div>

          {loadingPlans ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              {displayPlans.map((plan) => {
                const isCurrentPlan = plan.isFree
                  ? !currentSubscription
                  : currentSubscription?.plan_id === plan.id;
                const isProPlan = !plan.isFree;
                const canUpgrade = isProPlan && !isCurrentPlan;

                return (
                  <div
                    key={plan.id}
                    className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 flex flex-col transition-all duration-300 ${
                      plan.highlighted
                        ? "border-[var(--color-primary)]/50 bg-[var(--color-surface)]/60 shadow-lg shadow-[var(--color-primary)]/5"
                        : "border-[var(--color-surface-border)] bg-[var(--color-surface)]/30"
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]" />
                    )}

                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                        {plan.name === "Free" ? "Basic" : plan.name}
                      </h3>
                      <div className="mt-2">
                        {plan.isFree ? (
                          <span className="text-2xl font-bold text-[var(--color-text-primary)]">Free</span>
                        ) : (
                          <span className="text-2xl font-bold text-[var(--color-text-primary)]">${plan.price}<span className="text-sm font-normal text-[var(--color-text-muted)]">/{plan.period}</span></span>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-2.5 mb-6 flex-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2.5">
                          {feature.included ? (
                            <Check className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-4 h-4 text-[var(--color-text-muted)]/40 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={`text-sm ${feature.included ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)]"}`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full ${plan.highlighted && canUpgrade ? "glow-primary" : ""}`}
                      variant={plan.highlighted && canUpgrade ? "primary" : "outline"}
                      size="lg"
                      disabled={(!canUpgrade && !plan.isFree) || isLoading || (plan.isFree && !!currentSubscription)}
                      isLoading={isLoading && selectedPlan === plan.id}
                      onClick={canUpgrade && plan.id !== "free" ? () => handleUpgrade(plan.id) : undefined}
                    >
                      {isCurrentPlan ? "Current Plan" : plan.highlighted && canUpgrade ? "Upgrade to PRO" : plan.isFree ? "Basic Plan" : plan.cta}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* FAQ - minimal */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 pb-24">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] text-center mb-8">FAQ</h2>
          <div className="space-y-2">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="rounded-xl border border-[var(--color-surface-border)] overflow-hidden">
                  <button
                    onClick={() => {
                      setOpenFaqIndex(isOpen ? null : index);
                      trackEvent("faq_toggle", { event_category: "Subscription", question: item.question, is_open: !isOpen });
                    }}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <span className="font-medium text-sm text-[var(--color-text-primary)] pr-4">{item.question}</span>
                    <ChevronDown className={`w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="px-5 pb-4 text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
                      {item.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      
      {/* Success Modal - показываем когда подписка активирована */}
      <Modal
        isOpen={subscriptionActivated}
        onClose={() => {
          setSubscriptionActivated(false);
          window.location.reload();
        }}
        size="md"
        variant="centered"
        closeOnOverlayClick={false}
      >
        <ModalHeader>
          <ModalTitle>Subscription Activated!</ModalTitle>
          <ModalDescription>
            Your PRO subscription has been successfully activated
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              Welcome to PRO!
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              You now have full access to all PRO features on SolPoint
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                setSubscriptionActivated(false);
                window.location.reload();
              }}
            >
              Great!
            </Button>
          </div>
        </ModalContent>
      </Modal>
      
      {/* Payment Method Selection Modal */}
      <Modal
        isOpen={paymentMethodModalOpen}
        onClose={() => {
          setPaymentMethodModalOpen(false);
          setSelectedPaymentPlan(null);
          setSolanaPaymentStatus("");
          setSolanaPaymentError("");
        }}
        size="md"
        variant="centered"
      >
        <ModalHeader>
          <ModalTitle>Choose Payment Method</ModalTitle>
          <ModalDescription>
            Select payment method for {selectedPaymentPlan?.code} subscription
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          {selectedPaymentPlan && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  ${selectedPaymentPlan.price} {selectedPaymentPlan.currency.toUpperCase()}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {selectedPaymentPlan.interval_days} days subscription
                </p>
              </div>

              {/* Email Form */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-primary)]">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  placeholder="your@email.com"
                  className={`w-full px-3 py-2 bg-[var(--color-surface)] border ${
                    emailError ? "border-red-500" : "border-[var(--color-surface-border)]"
                  } rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]`}
                />
                {emailError && (
                  <p className="text-xs text-red-500">{emailError}</p>
                )}
                <p className="text-xs text-[var(--color-text-muted)]">
                      We&apos;ll use this email to activate your subscription after payment
                </p>
              </div>

              {/* Solana Option */}
              <Card variant="bordered" className="p-4 border-[var(--color-primary)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                      Solana (SOL)
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Direct transfer via WalletConnect
                    </p>
                  </div>
                  <Badge variant="primary" className="bg-[var(--color-primary)]">
                      Recommended
                    </Badge>
                </div>
                <SolanaPaymentButton
                  plan={selectedPaymentPlan}
                  email={email}
                  onStatusChange={(status, message) => {
                    setSolanaPaymentStatus(status);
                    setSolanaPaymentError("");
                  }}
                  onSuccess={(intentId) => {
                    // Редиректим на страницу активации
                    window.location.href = `/activate?code=${intentId}`;
                    trackEvent("subscription_activated", {
                      event_category: "Subscription",
                      payment_method: "solana",
                    });
                  }}
                  onError={(error, intentId) => {
                    setSolanaPaymentError(error);
                    setSolanaPaymentStatus("error");
                    if (intentId) {
                      setSolanaPaymentIntentId(intentId);
                    }
                  }}
                  onEmailValidationError={(error) => {
                    setEmailError(error);
                  }}
                />
                
                {/* Status and Error Display */}
                {solanaPaymentStatus && solanaPaymentStatus !== "error" && (
                  <div className="p-3 bg-[var(--color-surface)] rounded-lg">
                    <p className="text-sm text-[var(--color-text-secondary)] text-center">
                      {solanaPaymentStatus === "calculating" && "Calculating SOL amount..."}
                      {solanaPaymentStatus === "preparing" && "Preparing transaction..."}
                      {solanaPaymentStatus === "connecting" && "Connecting to Solana network..."}
                      {solanaPaymentStatus === "sending" && "Sending transaction to your wallet. Please confirm in your wallet."}
                      {solanaPaymentStatus === "creating_intent" && "Creating payment record..."}
                      {solanaPaymentStatus === "confirming" && "Waiting for transaction confirmation..."}
                      {solanaPaymentStatus === "verifying" && "Verifying payment..."}
                      {solanaPaymentStatus === "success" && "Payment verified! Redirecting..."}
                    </p>
                  </div>
                )}
                
                {solanaPaymentError && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-500 mb-1">
                          {solanaPaymentIntentId ? "Payment Intent Created" : "Payment Error"}
                        </p>
                        <div className="text-sm text-red-400 mb-3 break-words">
                          {solanaPaymentError}
                        </div>
                        <div className="flex gap-2">
                          {solanaPaymentIntentId ? (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  window.location.href = `/activate?code=${solanaPaymentIntentId}`;
                                }}
                                className="w-auto min-w-[120px]"
                              >
                                Activate Subscription
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSolanaPaymentError("");
                                  setSolanaPaymentStatus("");
                                  setSolanaPaymentIntentId(null);
                                }}
                                className="w-auto min-w-[120px]"
                              >
                                Dismiss
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSolanaPaymentError("");
                                setSolanaPaymentStatus("");
                                setSolanaPaymentIntentId(null);
                              }}
                              className="w-auto min-w-[120px]"
                            >
                              Try Again
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* NowPayments Option */}
              <Card variant="bordered" className="p-4 cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                      Cryptocurrencies (NowPayments)
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      TRX, USDC, MATIC, BNB and others
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Проверяем email перед началом оплаты
                      if (!email || !email.trim()) {
                        setEmailError("Email is required. Please enter your email first.");
                        return;
                      }
                      if (!validateEmail(email)) {
                        setEmailError("Please enter a valid email address");
                        return;
                      }
                      handleNowPaymentsPayment();
                    }}
                    disabled={!email || !!emailError}
                  >
                    Select
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        size="md"
        variant="centered"
      >
        <ModalHeader>
          <ModalTitle>Subscription Payment</ModalTitle>
          <ModalDescription>
            Send {paymentData?.pay_amount} {paymentData?.pay_currency} to the specified address
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          {paymentData && (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentData.pay_address)}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="text-center">
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                  Amount to pay
                </p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {paymentData.pay_amount} {paymentData.pay_currency}
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  ≈ ${paymentData.price_amount} {paymentData.price_currency}
                </p>
              </div>

              {/* Address */}
              <div>
                <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
                  Payment address:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={paymentData.pay_address}
                    readOnly
                    className="flex-1 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-sm font-mono text-[var(--color-text-primary)]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(paymentData.pay_address);
                        setAddressCopied(true);
                        setTimeout(() => setAddressCopied(false), 2000);
                      } catch (error) {
                        // Fallback
                        const textarea = document.createElement("textarea");
                        textarea.value = paymentData.pay_address;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand("copy");
                        document.body.removeChild(textarea);
                        setAddressCopied(true);
                        setTimeout(() => setAddressCopied(false), 2000);
                      }
                    }}
                  >
                    {addressCopied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-[var(--color-surface)] rounded-lg p-4 space-y-2">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  <strong className="text-[var(--color-text-primary)]">Instructions:</strong>
                </p>
                <ol className="text-sm text-[var(--color-text-secondary)] space-y-1 list-decimal list-inside">
                  <li>Copy the address above</li>
                  <li>Open your wallet (MetaMask, Trust Wallet, etc.)</li>
                  <li>Send {paymentData.pay_amount} {paymentData.pay_currency} to this address</li>
                  <li>Subscription will be activated automatically after blockchain confirmation</li>
                </ol>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  This is a secure address created specifically for your payment. 
                  After payment, the subscription will be activated automatically.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPaymentModalOpen(false)}
              >
                Close (status check continues automatically)
              </Button>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Auth Modal */}
      <Modal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        size="md"
        variant="centered"
      >
        <ModalHeader>
          <ModalTitle>Sign in required</ModalTitle>
          <ModalDescription>
            Please sign in or create an account to purchase a subscription
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              You need to be signed in to purchase a subscription. Sign in with your existing account or create a new one.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  router.push("/login");
                }}
                className="w-full"
              >
                Sign in
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  router.push("/signup");
                }}
                className="w-full"
              >
                Create account
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      <Footer />
    </>
  );
}

export default function SubscriptionPage() {
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
      <SubscriptionPageContent />
    </Suspense>
  );
}

