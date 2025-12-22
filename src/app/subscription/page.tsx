"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button, Card, Badge, Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent } from "@/components/ui";
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
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { Plan, Subscription } from "@/types";
import { SolanaPaymentButton } from "@/components/subscription/solana-payment-button";

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
  { text: "Everything in Free", included: true },
  { text: "View full user profiles", included: true },
  { text: "Direct messaging", included: true },
  { text: "City & role filters", included: true },
  { text: "Create hubs, projects, events", included: true },
  { text: "Private events access", included: true },
  { text: "Badges & gold map marker", included: true },
  { text: "See all lists of friends and people", included: true },
];

const proBenefits = [
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
    icon: Eye,
    title: "Show All Everywhere",
    description: "Open full lists instead of previews: members of hubs & communities, people attending events, users in your city. See who exactly is there.",
  },
  {
    icon: Wrench,
    title: "Create & Organize",
    description: "Create hubs, communities, projects, workspaces, and events. Keep SolPoint curated and spam-free.",
  },
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
    icon: Compass,
    title: "Role-Based Discovery",
    description: "Filter the map by roles: developers, founders, designers, community leads. Find the right people, not just more people.",
  },
  {
    icon: Shield,
    title: "Badges & Reputation",
    description: "Display verified badges: Superteam member, DAO contributor, NFT holder. Build trust and credibility instantly.",
  },
];

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
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

  // Загружаем планы и текущую подписку
  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
    trackEvent("subscription_page_view", {
      event_category: "Subscription",
    });
  }, []);

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

    // Показываем модальное окно выбора способа оплаты
    setSelectedPaymentPlan(plan);
    setPaymentMethodModalOpen(true);
  };

  const handleNowPaymentsPayment = async () => {
    if (!selectedPaymentPlan) return;
    
    setIsLoading(true);
    setSelectedPlan(selectedPaymentPlan.id);
    setPaymentMethodModalOpen(false);

    try {
      trackEvent("subscription_payment_start", {
        event_category: "Subscription",
        plan_name: selectedPaymentPlan.code,
        price: selectedPaymentPlan.price,
      });

      // Создаем платеж через NowPayments
      const response = await fetch("/api/subscriptions/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: selectedPaymentPlan.id,
          success_url: `${window.location.origin}/subscription?success=true`,
          cancel_url: `${window.location.origin}/subscription?cancelled=true`,
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
      
      console.log("Payment data received:", paymentResponse);

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
        // Проверяем платежи в NowPayments и активируем подписку если нужно
        const checkInterval = setInterval(async () => {
          try {
            // Вызываем manual-check который проверит платежи и активирует подписку
            const checkResponse = await fetch("/api/subscriptions/manual-check", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            });

            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              
              // Если подписка была активирована - показываем успех
              if (checkData.activated > 0) {
                clearInterval(checkInterval);
                setPaymentModalOpen(false);
                setSubscriptionActivated(true);
                
                // Обновляем данные на странице
                await fetchCurrentSubscription();
                await fetchPlans();
                
                trackEvent("subscription_activated", {
                  event_category: "Subscription",
                  activated_count: checkData.activated,
                });
              }
            }
          } catch (error) {
            console.error("Error checking payments:", error);
          }
        }, 5000);
        
        // Останавливаем проверку через 10 минут
        setTimeout(() => {
          clearInterval(checkInterval);
        }, 10 * 60 * 1000);
      } else {
        console.error("Invalid payment data:", paymentResponse);
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
      description: "Basic access to the Solana community map",
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
        description: "Connect & build",
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
        <section className="py-16 text-center relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <h1 className="text-4xl sm:text-5xl font-bold text-[var(--color-text-primary)] mb-4">
              Unlock the Full Power of{" "}
              <span className="text-gradient">SolPoint</span>
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-6">
              Get real connections in the Solana ecosystem with SolPoint PRO
            </p>
            {/* White line divider */}
            <div className="w-24 h-px bg-white mx-auto"></div>
          </div>
        </section>

        {/* Benefits */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
              PRO benefits
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {proBenefits.map((benefit, index) => (
              <Card
                key={index}
                variant="bordered"
                className="p-6 bg-[#0D1316]"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--color-warning)]/20 to-[var(--color-warning)]/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-[var(--color-warning)]" />
                </div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {benefit.description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-20">
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
                    className={`p-8 relative bg-[#0D1316] ${
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
                          Free
                        </Badge>
                      ) : plan.highlighted ? (
                        <div className="text-right">
                          <Badge variant="warning" className="bg-[var(--color-warning)] text-[var(--color-background)]">
                            ${plan.price} / month
                          </Badge>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">Early access price</p>
                        </div>
                      ) : null}
                    </div>
                    
                    <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                      {plan.isFree ? "Explore the ecosystem" : "Connect & build"}
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
                      className={`w-full ${
                        plan.highlighted && canUpgrade
                          ? "bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90 text-[var(--color-background)]"
                          : ""
                      }`}
                      variant={plan.highlighted && canUpgrade ? "primary" : "outline"}
                      size="lg"
                      disabled={(!canUpgrade && !plan.isFree) || isLoading || (plan.isFree && currentSubscription)}
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
                        ? "Current plan" 
                        : plan.highlighted && canUpgrade 
                          ? "Upgrade to PRO" 
                          : plan.isFree
                            ? (currentSubscription ? "Basic Plan" : "Current Plan")
                            : plan.cta}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Payment info */}
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

          {/* Manual check button */}
          <Card variant="bordered" className="p-6 bg-[#0D1316]">
            <div className="text-center">
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Если вы уже оплатили, но подписка не активировалась автоматически
              </p>
              <Button
                variant="outline"
                size="lg"
                isLoading={checkingManually}
                onClick={handleManualCheck}
                className="w-full sm:w-auto"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Проверить платежи и активировать подписку
              </Button>
            </div>
          </Card>
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
                  >
                    Select
                  </Button>
                </div>
              </Card>

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
                  onSuccess={() => {
                    setPaymentMethodModalOpen(false);
                    setSelectedPaymentPlan(null);
                    setSubscriptionActivated(true);
                    fetchCurrentSubscription();
                    fetchPlans();
                    trackEvent("subscription_activated", {
                      event_category: "Subscription",
                      payment_method: "solana",
                    });
                  }}
                  onError={(error) => {
                    alert(`Ошибка оплаты: ${error}`);
                  }}
                />
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
          <ModalTitle>Оплата подписки</ModalTitle>
          <ModalDescription>
            Отправьте {paymentData?.pay_amount} {paymentData?.pay_currency} на указанный адрес
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
                  Сумма к оплате
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
                  Адрес для оплаты:
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
                  <strong className="text-[var(--color-text-primary)]">Инструкция:</strong>
                </p>
                <ol className="text-sm text-[var(--color-text-secondary)] space-y-1 list-decimal list-inside">
                  <li>Скопируйте адрес выше</li>
                  <li>Откройте ваш кошелек (MetaMask, Trust Wallet и т.д.)</li>
                  <li>Отправьте {paymentData.pay_amount} {paymentData.pay_currency} на этот адрес</li>
                  <li>Подписка активируется автоматически после подтверждения в блокчейне</li>
                </ol>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Это безопасный адрес, созданный специально для вашего платежа. 
                  После оплаты подписка будет активирована автоматически.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPaymentModalOpen(false)}
              >
                Закрыть (проверка статуса продолжается автоматически)
              </Button>
            </div>
          )}
        </ModalContent>
      </Modal>

      <Footer />
    </>
  );
}

