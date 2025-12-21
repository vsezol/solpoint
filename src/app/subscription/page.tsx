"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button, Card, Badge, Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent } from "@/components/ui";
import {
  Crown,
  Check,
  MapPin,
  MessageCircle,
  Users,
  Calendar,
  Wallet,
  Shield,
  Loader2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { Plan, Subscription } from "@/types";

const freePlanFeatures = [
  { text: "View users by country", included: true },
  { text: "See official events", included: true },
  { text: "Access public hubs", included: true },
  { text: "View city-level locations", included: false },
  { text: "See user profiles & bios", included: false },
  { text: "Send direct messages", included: false },
  { text: "Access private events", included: false },
  { text: "Advanced filters", included: false },
];

const vipPlanFeatures = [
  { text: "View users by country", included: true },
  { text: "See official events", included: true },
  { text: "Access public hubs", included: true },
  { text: "View city-level locations", included: true },
  { text: "See user profiles & bios", included: true },
  { text: "Send direct messages", included: true },
  { text: "Access private events", included: true },
  { text: "Advanced filters", included: true },
];

const vipBenefits = [
  {
    icon: MapPin,
    title: "City-Level Access",
    description: "See exactly where users are located down to the city level",
  },
  {
    icon: MessageCircle,
    title: "Direct Messaging",
    description: "Connect directly with any user in the ecosystem",
  },
  {
    icon: Users,
    title: "Full Profiles",
    description: "View complete bios, social links, and user information",
  },
  {
    icon: Calendar,
    title: "Private Events",
    description: "Access exclusive VIP-only meetups and networking events",
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
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
    setIsLoading(true);
    setSelectedPlan(planId);
    
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      alert("План не найден");
      setIsLoading(false);
      return;
    }

    trackEvent("subscription_upgrade_click", {
      event_category: "Subscription",
      plan_name: plan.code,
      price: plan.price,
    });

    try {
      trackEvent("subscription_payment_start", {
        event_category: "Subscription",
        plan_name: plan.code,
        price: plan.price,
      });

      // Создаем платеж через NowPayments
      const response = await fetch("/api/subscriptions/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: planId,
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
        throw new Error("Не получены данные для оплаты от платежного сервиса");
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      trackEvent("subscription_payment_error", {
        event_category: "Subscription",
        plan_name: plan.code,
        error_message: error instanceof Error ? error.message : "unknown",
      });
      alert(
        `Не удалось создать платеж: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
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
          alert(`✅ Проверено платежей: ${data.checked}\n✅ Активировано подписок: ${data.activated}\n\nПодписка активирована! Обновляю страницу...`);
          await fetchCurrentSubscription();
          await fetchPlans();
          window.location.reload();
        } else {
          alert(`Проверено платежей: ${data.checked}\nАктивировано подписок: ${data.activated}\n\n${data.message || "Нет завершенных платежей для активации"}`);
          await fetchCurrentSubscription();
        }
      } else {
        alert(`Ошибка: ${data.error || "Неизвестная ошибка"}`);
      }
    } catch (error) {
      console.error("Error manual check:", error);
      alert(`Ошибка при проверке: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
    } finally {
      setCheckingManually(false);
    }
  };

  // Формируем список планов для отображения
  const displayPlans = [
    {
      id: "free",
      name: "Free",
      price: 0,
      period: "forever",
      description: "Basic access to the Solana community map",
      features: freePlanFeatures,
      cta: currentSubscription ? "Current Plan" : "Current Plan",
      highlighted: false,
      isFree: true,
    },
    ...plans.map((plan) => {
      // Определяем название плана
      let planName = "VIP";
      if (plan.code === "monthly") {
        planName = "VIP Monthly";
      } else if (plan.code === "yearly") {
        planName = "VIP Yearly";
      } else if (plan.code === "pro") {
        planName = "Pro";
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
        description: "Full access to unlock the power of Solana networking",
        features: vipPlanFeatures,
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
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        {/* Hero */}
        <section className="py-16 text-center animated-bg relative overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-warning)]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-secondary)]/10 rounded-full blur-3xl" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-warning)]/20 text-[var(--color-warning)] mb-6">
              <Crown className="w-5 h-5" />
              <span className="font-medium">VIP Membership</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-[var(--color-text-primary)] mb-4">
              Unlock the Full Power of{" "}
              <span className="text-gradient">SolPoint</span>
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
              Get unlimited access to profiles, messages, and exclusive events
              with VIP membership.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
          {loadingPlans ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {displayPlans.map((plan) => {
                const isCurrentPlan = currentSubscription?.plan_id === plan.id;
                const isVipPlan = !plan.isFree;
                const canUpgrade = isVipPlan && !isCurrentPlan;

                return (
                  <Card
                    key={plan.id}
                    variant="bordered"
                    className={`p-8 relative ${
                      plan.highlighted
                        ? "border-[var(--color-warning)] ring-2 ring-[var(--color-warning)]/20"
                        : ""
                    }`}
                  >
                    {plan.highlighted && (
                      <Badge
                        variant="warning"
                        className="absolute -top-3 left-1/2 -translate-x-1/2"
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    )}

                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-[var(--color-text-primary)]">
                          {plan.price === 0
                            ? "Free"
                            : `$${plan.price} ${plan.period !== "forever" ? "" : ""}`}
                        </span>
                        {plan.period !== "forever" && (
                          <span className="text-[var(--color-text-muted)]">
                            /{plan.period}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                        {plan.description}
                      </p>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, index) => (
                        <li
                          key={index}
                          className={`flex items-center gap-3 ${
                            feature.included
                              ? "text-[var(--color-text-secondary)]"
                              : "text-[var(--color-text-muted)] line-through"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              feature.included
                                ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                                : "bg-[var(--color-surface-border)]"
                            }`}
                          >
                            {feature.included && <Check className="w-3 h-3" />}
                          </div>
                          {feature.text}
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
                      disabled={!canUpgrade || isLoading}
                      isLoading={isLoading && selectedPlan === plan.id}
                      onClick={
                        canUpgrade && plan.id !== "free"
                          ? () => handleUpgrade(plan.id)
                          : undefined
                      }
                    >
                      {plan.highlighted && canUpgrade && (
                        <Crown className="w-5 h-5 mr-2" />
                      )}
                      {isCurrentPlan ? "Current Plan" : plan.cta}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Benefits */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <h2 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-12">
            VIP Benefits
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {vipBenefits.map((benefit, index) => (
              <Card
                key={index}
                variant="bordered"
                className="text-center p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-warning)]/20 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-6 h-6 text-[var(--color-warning)]" />
                </div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {benefit.description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Payment info */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
          <Card variant="bordered" className="p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Wallet className="w-6 h-6 text-[var(--color-primary)]" />
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Pay with Cryptocurrency
              </h3>
            </div>
            <p className="text-[var(--color-text-secondary)] mb-6">
              VIP subscriptions are paid via NowPayments. You can pay with TRX, USDC, MATIC, or other cryptocurrencies.
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
          <Card variant="bordered" className="p-6">
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
          <ModalTitle>Подписка активирована!</ModalTitle>
          <ModalDescription>
            Ваша VIP подписка успешно активирована
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              Добро пожаловать в VIP!
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Теперь у вас есть полный доступ ко всем VIP функциям SolPoint
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
              Отлично!
            </Button>
          </div>
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

