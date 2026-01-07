"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
// TODO: Uncomment when database has enough data to display interactive map
// import dynamic from "next/dynamic";
import { Header, Footer } from "@/components/layout";
import { Button, Card, Badge, Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent } from "@/components/ui";
// TODO: Uncomment when database has enough data to display interactive map
// import { getMapMarkers } from "@/lib/api/map";
// import type { MapMarker, MapFilters } from "@/types";

// Dynamic import for map component to avoid SSR issues with Leaflet
// TODO: Uncomment when database has enough data to display
// const SolPointMap = dynamic(
//   () => import("@/components/map/solpoint-map").then((mod) => mod.SolPointMap),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface)]">
//         <div className="flex flex-col items-center gap-4">
//           <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
//           <p className="text-[var(--color-text-secondary)]">Loading map...</p>
//         </div>
//       </div>
//     ),
//   }
// );
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  // TODO: Uncomment when database has enough data to display interactive map
  // const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  // const [loadingMap, setLoadingMap] = useState(true);
  // const isVip = user?.subscription_tier === "vip";
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

  // Проверяем параметры URL для успешной/отмененной оплаты
  useEffect(() => {
    const success = searchParams.get("success");
    const cancelled = searchParams.get("cancelled");
    
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
    }
  }, [searchParams]);

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
  // TODO: Uncomment when database has enough data to display
  // useEffect(() => {
  //   async function loadMapMarkers() {
  //     try {
  //       setLoadingMap(true);
  //       const filters: MapFilters = {
  //         showUsers: true,
  //         showEvents: true,
  //         showHubs: true,
  //         showCommunities: true,
  //         showWorkspaces: true,
  //         contentType: "all",
  //       };
  //       const markers = await getMapMarkers(filters, user?.id, isVip);
  //       setMapMarkers(markers);
  //     } catch (error) {
  //       console.error("Error loading map markers:", error);
  //     } finally {
  //       setLoadingMap(false);
  //     }
  //   }

  //   if (!authLoading) {
  //     loadMapMarkers();
  //   }
  // }, [user?.id, isVip, authLoading]);

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
      <main className="min-h-screen pt-16 pb-16 animated-bg">
        {/* Hero */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          {/* Background with Solana gradient - transparent */}
          <div className="absolute inset-0 bg-transparent"></div>
          
          {/* Content overlay */}
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            {/* Main Headline */}
            <h1 className="text-lg sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-10 leading-tight">
              <span className="text-[var(--color-text-primary)]">
                Find Solana Builders Anywhere
              </span>
              <br />
              <span className="text-gradient">In Your City or at Any Event</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg sm:text-xl md:text-2xl text-[var(--color-text-secondary)] max-w-4xl mx-auto mb-10 leading-relaxed">
              <span className="block mb-1.5">SolPoint is your daily tool for Solana networking.</span>
              Whether you&apos;re organizing local meetups, traveling to a new city, or heading to Breakpoint — instantly connect with founders, developers, marketers, community leads and others.
            </p>
            
            
            {/* Key Benefits */}
            <div className="flex flex-col sm:flex-row gap-6 mb-10 max-w-5xl mx-auto mt-8">
              <div className="flex flex-col items-center text-center">
                <MapPin className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0 mb-2" />
                <h3 className="font-semibold text-[var(--color-text-primary)] text-base sm:text-lg mb-1">
                  Local networking
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">
                Find relevant people in your city and connect anytime
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <Compass className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0 mb-2" />
                <h3 className="font-semibold text-[var(--color-text-primary)] text-base sm:text-lg mb-1">
                  Travel ready
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">
                Instantly connect with the local Solana community when you arrive
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <Calendar className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0 mb-2" />
                <h3 className="font-semibold text-[var(--color-text-primary)] text-base sm:text-lg mb-1">
                  Event optimized
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">
                Know exactly who to meet at conferences and events
                </p>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                variant="primary"
                size="lg"
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-background)] font-semibold px-8 py-6 text-lg w-full sm:w-auto"
                onClick={() => {
                  trackEvent("hero_cta_explore_map", {
                    event_category: "Subscription",
                  });
                  router.push("/map");
                }}
              >
                Explore the Map
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-[var(--color-surface-border)] hover:border-[var(--color-primary)] px-8 py-6 text-lg w-full sm:w-auto"
                onClick={() => {
                  trackEvent("hero_cta_how_it_works", {
                    event_category: "Subscription",
                  });
                  // Scroll to next section
                  const nextSection = document.querySelector("section:nth-of-type(2)");
                  if (nextSection) {
                    nextSection.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                See How It Works
              </Button>
            </div>
          </div>
          
          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
            <ChevronDown className="w-6 h-6 text-[var(--color-text-muted)]" />
          </div>
        </section>

        {/* Problem → Solution Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          {/* Optional header - можно убрать если не нужен */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-[var(--color-primary)] font-semibold text-lg">
              <span>With SolPoint PRO</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* Left Column - The Problem */}
            <div className="bg-[#0D1316] border border-red-500/20 rounded-lg p-8 lg:p-10 relative overflow-hidden flex flex-col h-full">
              {/* Red tint overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mb-6">
                  The Current Reality
                </h2>
                
                <p className="text-[var(--color-text-secondary)] mb-8 leading-relaxed">
                  Whether you&apos;re attending events, traveling to new cities, or trying to build a local community — finding the right people is still unnecessarily hard.
                </p>
                
                {/* Pain points list */}
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">Random, low-value conversations at events</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">Arriving in a new city with zero relevant contacts</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">Difficulty finding active members for meetups or hubs</span>
                  </li>
                </ul>
                
                <p className="text-sm text-[var(--color-text-muted)] italic mt-auto">
                  This is how Solana networking works for most builders today.
                </p>
              </div>
            </div>

            {/* Right Column - The Solution */}
            <div className="bg-[#111820] border border-[var(--color-primary)]/30 rounded-lg p-8 lg:p-10 relative overflow-hidden flex flex-col h-full">
              {/* Green tint overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-primary)]/5 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold mb-6">
                  <span className="text-gradient">With SolPoint PRO</span>
                </h2>
                
                <p className="text-[var(--color-text-secondary)] mb-8 leading-relaxed">
                  Connect with the right people instantly — whether you&apos;re organizing, traveling, or attending events.
                </p>
                
                {/* Solution points list */}
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">Organize and grow local meetups</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">Instantly connect when you land in a new city</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">Message attendees and build real communities</span>
                  </li>
                </ul>
                
                <p className="text-sm text-[var(--color-text-muted)] italic mt-auto">
                  Turn every opportunity into meaningful connections and collaborations.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center mt-12">
            <Button
              variant="primary"
              size="lg"
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-background)] font-semibold px-8 py-6 text-lg"
              onClick={() => {
                trackEvent("problem_solution_cta_click", {
                  event_category: "Subscription",
                });
                // Scroll to pricing section
                const pricingSection = document.getElementById("pricing-section");
                if (pricingSection) {
                  pricingSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              Upgrade to PRO — Start Networking Smarter
            </Button>
          </div>
        </section>

        {/* <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
              Main advantages:
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainAdvantages.map((benefit, index) => (
              <Card
                key={index}
                variant="bordered"
                className="p-6 bg-[#0D1316] flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--color-warning)]/20 to-[var(--color-warning)]/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-[var(--color-warning)]" />
                </div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-2 text-center">
                  {benefit.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed text-center">
                  {benefit.description}
                </p>
              </Card>
            ))}
          </div>
        </section> */}

        {/* Core Benefits - Zig-zag Layout */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
              Turn Every Solana Event into Real Opportunities
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-3xl mx-auto">
              PRO features that transform how you network and build in the Solana ecosystem
            </p>
          </div>

          {/* Block 1: Text Left, Visual Right */}
          <div className="mb-24 last:mb-0">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Text Content */}
              <div className="space-y-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Compass className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0" />
                    <MapPin className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
                    Discover the Right People — Right Where You Are
                  </h3>
                </div>
                
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  Whether you&apos;re at home, traveling, or preparing for an event — instantly see relevant Solana builders, founders, marketers, and community leaders in your current city.
                  Filter by role, activity, and intent to connect with people who actually matter.
                </p>
                
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">
                      City-level access + role-based filters
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">
                      Find the people who match your goals, not just more contacts
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual */}
              <div className="relative overflow-hidden rounded-lg border border-[var(--color-primary)]/30">
                <Image
                  src="/degen-map.png"
                  alt="Map view with role filters & city-level access"
                  width={800}
                  height={450}
                  className="w-full h-full object-cover aspect-video"
                />
              </div>

              {/* TODO: Uncomment interactive map when database has enough data to display */}
              {/* Visual - Interactive Map */}
              {/* <div className="relative overflow-hidden rounded-lg border border-[var(--color-primary)]/30 aspect-video">
                {loadingMap ? (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface)]">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[var(--color-text-secondary)]">Loading map...</p>
                    </div>
                  </div>
                ) : (
                  <SolPointMap
                    markers={mapMarkers}
                    center={[35, 55]}
                    zoom={4}
                    isVip={isVip}
                    isAuthenticated={isAuthenticated}
                    currentUserId={user?.id}
                  />
                )}
              </div> */}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-surface-border)] to-transparent mb-24"></div>

          {/* Block 2: Visual Left, Text Right */}
          <div className="mb-24 last:mb-0">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Visual */}
              <div className="relative order-2 lg:order-1">
                <div className="aspect-video bg-gradient-to-br from-[var(--color-primary)]/20 via-[#0D1316] to-[#0D1316] rounded-lg border border-[var(--color-primary)]/30 p-8 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <MessageCircle className="w-16 h-16 text-[var(--color-primary)] mx-auto" />
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Full profiles & direct messaging interface
                    </p>
                  </div>
                </div>
              </div>

              {/* Text Content */}
              <div className="space-y-6 order-1 lg:order-2">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0" />
                    <MessageCircle className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
                    Connect Directly. No Awkward Moments.
                  </h3>
                </div>
                
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  See real profiles behind hubs, projects, and events.
                  Message anyone directly on SolPoint — whether it&apos;s a quick coffee chat, a 1:1 while traveling, or a follow-up after an event.
                </p>
                
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">
                      Full user profiles with direct messaging
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">
                      Access full lists: members, attendees, city residents
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-surface-border)] to-transparent mb-24"></div>

          {/* Block 3: Text Left, Visual Right */}
          <div className="mb-16">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Text Content */}
              <div className="space-y-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
                    Build and Organize — Shape the Ecosystem
                  </h3>
                </div>
                
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  Create hubs, projects, local meetups, and private events. Get gold markers and badges to stand out as a community leader — whether you&apos;re running weekly gatherings or organizing Hacker Houses.
                </p>
                
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">
                      Create hubs, projects, and events
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">
                      Stand out with gold markers and verified badges
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual */}
              <div className="relative">
                <div className="aspect-video bg-gradient-to-br from-[var(--color-warning)]/20 via-[#0D1316] to-[#0D1316] rounded-lg border border-[var(--color-warning)]/30 p-8 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Wrench className="w-16 h-16 text-[var(--color-warning)] mx-auto" />
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Create & organize with gold markers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center mt-16">
            <Button
              variant="primary"
              size="lg"
              className="bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90 text-[var(--color-background)] font-semibold px-8 py-6 text-lg"
              onClick={() => {
                trackEvent("core_benefits_cta_click", {
                  event_category: "Subscription",
                });
                // Scroll to pricing section
                const pricingSection = document.getElementById("pricing-section");
                if (pricingSection) {
                  pricingSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              Upgrade to PRO — Start Building Real Connections
            </Button>
          </div>
        </section>

        {/* Pricing Cards */}
        <section id="pricing-section" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-20">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
              Upgrade to PRO — Network Like a Pro
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-3xl mx-auto">
           Your daily tool for local meetups, travel networking, and maximizing every Solana event.
            </p>
          </div>

          {loadingPlans ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {displayPlans.map((plan) => {
                // Для Basic плана (id === "free") проверяем отсутствие подписки
                // Для PRO планов проверяем совпадение plan_id
                const isCurrentPlan = plan.isFree 
                  ? !currentSubscription  // Basic - текущий план если нет подписки
                  : currentSubscription?.plan_id === plan.id;  // PRO - текущий план если совпадает plan_id
                const isProPlan = !plan.isFree;
                const canUpgrade = isProPlan && !isCurrentPlan;
                

                return (
                  <Card
                    key={plan.id}
                    variant="bordered"
                    className={`p-8 relative bg-[#0D1316] flex flex-col ${
                      plan.highlighted
                        ? "border-[var(--color-warning)]"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">
                        {plan.name === "Free" ? "Basic" : plan.name}
                      </h3>
                      {plan.isFree ? (
                        <Badge variant="outline" className="bg-[#0D1316]">
                          Free forever
                        </Badge>
                      ) : plan.highlighted ? (
                        <Badge variant="outline" className="bg-green-500/20 border-green-500 text-green-400">
                          ${plan.price} / month
                        </Badge>
                      ) : null}
                    </div>
                    
                    <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                      {plan.description}
                    </p>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, index) => (
                        <li
                          key={index}
                          className={`flex items-center gap-3 ${
                            feature.included
                              ? "text-[var(--color-text-secondary)]"
                              : "text-[var(--color-text-muted)]"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              feature.included
                                ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                                : "bg-[var(--color-surface-border)]"
                            }`}
                          >
                            {feature.included && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-sm">{feature.text}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full mt-auto ${
                        plan.highlighted && canUpgrade
                          ? "bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90 text-[var(--color-background)]"
                          : ""
                      }`}
                      variant={plan.highlighted && canUpgrade ? "primary" : "outline"}
                      size="lg"
                      disabled={(!canUpgrade && !plan.isFree) || isLoading || (plan.isFree && !!currentSubscription)}
                      isLoading={isLoading && selectedPlan === plan.id}
                      onClick={
                        canUpgrade && plan.id !== "free"
                          ? () => handleUpgrade(plan.id)
                          : undefined
                      }
                    >
                      {plan.highlighted && canUpgrade && (
                        <Check className="w-5 h-5 mr-2" />
                      )}
                      {isCurrentPlan 
                        ? "Current Plan" 
                        : plan.highlighted && canUpgrade 
                          ? "Upgrade to PRO" 
                          : plan.isFree
                            ? "Basic Plan"
                            : plan.cta}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mb-4">
              Everything You Need to Know Before Upgrading
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Common questions from Solana builders attending Breakpoint, Hacker Houses, and local meetups.
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <Card
                  key={index}
                  variant="bordered"
                  className="bg-[#0D1316] overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => {
                      setOpenFaqIndex(isOpen ? null : index);
                      trackEvent("faq_toggle", {
                        event_category: "Subscription",
                        question: item.question,
                        is_open: !isOpen,
                      });
                    }}
                    className="w-full p-6 flex items-start gap-4 text-left hover:bg-[var(--color-surface-hover)] transition-colors duration-200"
                  >
                    <HelpCircle className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--color-text-primary)] mb-0 pr-8">
                        {item.question}
                      </h3>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? "transform rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-6 pb-6 pl-[3.25rem]">
                      <div className="text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
                        {item.answer}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
              Other:
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {moreBenefits.map((benefit, index) => (
              <Card
                key={index}
                variant="bordered"
                className="p-6 bg-[#0D1316] flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--color-warning)]/20 to-[var(--color-warning)]/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-[var(--color-warning)]" />
                </div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-2 text-center">
                  {benefit.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed text-center">
                  {benefit.description}
                </p>
              </Card>
            ))}
          </div>
        </section> */}

        {/* 
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
          <Card variant="bordered" className="p-8 text-center bg-[#0D1316]">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Wallet className="w-6 h-6 text-[var(--color-primary)]" />
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Pay with Cryptocurrency
              </h3>
            </div>
            <p className="text-[var(--color-text-secondary)] mb-6">
              PRO subscriptions are paid via NowPayments or Solana. You can pay with TRX, USDC, MATIC, SOL, or other cryptocurrencies.
              Your subscription will be activated automatically after payment confirmation.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-[var(--color-text-muted)]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--color-primary)]" />
                Secure payments
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[var(--color-primary)]" />
                Instant activation
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[var(--color-primary)]" />
                Multiple currencies
              </div>
            </div>
          </Card>

          <Card variant="bordered" className="p-6 bg-[#0D1316]">
            <div className="text-center">
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                If you have already paid but the subscription has not been activated automatically
              </p>
              <Button
                variant="outline"
                size="lg"
                isLoading={checkingManually}
                onClick={handleManualCheck}
                className="w-full sm:w-auto"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Check payments and activate subscription
              </Button>
            </div>
          </Card>
        </section> 
        */}
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
                  onError={(error) => {
                    setSolanaPaymentError(error);
                    setSolanaPaymentStatus("error");
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
                          Payment Error
                        </p>
                        <div className="text-sm text-red-400 mb-3 break-words">
                          {solanaPaymentError}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSolanaPaymentError("");
                            setSolanaPaymentStatus("");
                          }}
                          className="w-auto min-w-[120px]"
                        >
                          Try Again
                        </Button>
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
                    onClick={handleNowPaymentsPayment}
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

