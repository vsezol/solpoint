"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button, Card, Badge } from "@/components/ui";
import { Twitter, AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import Image from "next/image";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";

function ActivatePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [intent, setIntent] = useState<{
    id: string;
    intent_id: string;
    email: string;
    status: string;
    tx_signature?: string;
    expires_at: string;
    created_at: string;
    plans?: {
      id: string;
      code: string;
      price: number;
      currency: string;
      interval_days: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam) {
      setCode(codeParam);
      fetchIntent(codeParam);
    } else {
      // Проверяем localStorage
      if (typeof window !== "undefined") {
        const savedIntentId = localStorage.getItem("subscription_intent_id");
        if (savedIntentId) {
          setCode(savedIntentId);
          fetchIntent(savedIntentId);
        } else {
          setError("No activation code provided");
          setLoading(false);
        }
      } else {
        setError("No activation code provided");
        setLoading(false);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // Если пользователь авторизован и intent найден и оплачен, активируем подписку
    if (isAuthenticated && user && intent && intent.status === "paid" && !success && !activating) {
      activateSubscription();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, intent, success, activating]);

  const fetchIntent = async (intentId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/intent?code=${intentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch intent");
      }
      const data = await response.json();
      let intent = data.intent;
      
      // Если статус pending но есть tx_signature - проверяем транзакцию
      if (intent.status === "pending" && intent.tx_signature) {
        const checkResponse = await fetch("/api/subscriptions/check-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            intent_id: intentId,
          }),
        });
        
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.updated && checkData.status === "paid") {
            // Обновляем localStorage
            if (typeof window !== "undefined") {
              localStorage.setItem("subscription_intent_status", "paid");
            }
            // Перезагружаем intent с сервера
            const refreshResponse = await fetch(`/api/subscriptions/intent?code=${intentId}`);
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              intent = refreshData.intent;
            }
          }
        }
      }
      
      setIntent(intent);
      
      if (intent.status === "claimed") {
        // Обновляем localStorage на success
        if (typeof window !== "undefined") {
          localStorage.setItem("subscription_intent_status", "success");
          localStorage.removeItem("subscription_intent_id");
        }
        setSuccess(true);
        setError("This subscription has already been activated");
      } else if (intent.status === "expired") {
        setError("This activation code has expired");
      } else if (intent.status !== "paid") {
        setError(`This subscription is not ready for activation. Status: ${intent.status}`);
      }
    } catch (error) {
      console.error("Error fetching intent:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch activation code");
    } finally {
      setLoading(false);
    }
  };

  const activateSubscription = async () => {
    if (!code || !user) return;

    setActivating(true);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent_id: code,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to activate subscription");
      }

      await response.json();
      
      // Обновляем localStorage на success и удаляем intent_id
      if (typeof window !== "undefined") {
        localStorage.setItem("subscription_intent_status", "success");
        localStorage.removeItem("subscription_intent_id");
      }

      setSuccess(true);
      
      trackEvent("subscription_activated", {
        event_category: "Subscription",
        intent_id: code,
      });

      // Редиректим на страницу подписки через 2 секунды
      setTimeout(() => {
        router.push("/subscription?activated=true");
      }, 2000);
    } catch (error) {
      console.error("Error activating subscription:", error);
      setError(error instanceof Error ? error.message : "Failed to activate subscription");
    } finally {
      setActivating(false);
    }
  };

  const handleTwitterLogin = () => {
    const redirectTo = `/activate?code=${code}`;
    window.location.href = `/api/auth/twitter?redirect_to=${encodeURIComponent(redirectTo)}`;
  };

  if (loading || authLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-16 flex items-center justify-center animated-bg px-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            <p className="text-[var(--color-text-secondary)]">Loading...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error && !intent) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-16 flex items-center justify-center animated-bg px-4">
          <Card variant="bordered" className="w-full max-w-md p-8">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <AlertCircle className="w-6 h-6" />
              <h1 className="text-2xl font-bold">Activation Error</h1>
            </div>
            <p className="text-[var(--color-text-secondary)] mb-6">{error}</p>
            <Button
              variant="outline"
              onClick={() => router.push("/subscription")}
              className="w-full"
            >
              Go to Subscription Page
            </Button>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  if (success) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-16 flex items-center justify-center animated-bg px-4">
          <Card variant="bordered" className="w-full max-w-md p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              Subscription Activated!
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Your PRO subscription has been successfully activated. Redirecting...
            </p>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 flex items-center justify-center animated-bg px-4">
        <Card variant="bordered" className="w-full max-w-md p-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.svg"
              alt="SolPoint"
              width={60}
              height={60}
            />
          </div>

          <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-2">
            Activate Your Subscription
          </h1>
          <p className="text-center text-[var(--color-text-secondary)] mb-6">
            {intent?.status === "paid"
              ? "Sign in to activate your subscription"
              : "Your subscription payment is being processed"}
          </p>

          {intent && (
            <div className="mb-6 p-4 bg-[var(--color-surface)] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Plan:</span>
                <Badge variant="primary">{intent.plans?.code || "PRO"}</Badge>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Email:</span>
                <span className="text-sm text-[var(--color-text-primary)]">{intent.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Status:</span>
                <Badge
                  variant={intent.status === "paid" ? "primary" : "outline"}
                >
                  {intent.status === "paid" ? "Paid" : intent.status}
                </Badge>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-2 text-red-500">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {!isAuthenticated && intent?.status === "paid" && (
            <>
              <div className="space-y-3 mb-4">
                <Button
                  onClick={handleTwitterLogin}
                  className="w-full bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white"
                  size="lg"
                >
                  <Twitter className="w-5 h-5 mr-2" />
                  Sign In with Twitter
                </Button>

                <Button
                  onClick={() => {
                    const redirectTo = `/activate?code=${code}`;
                    window.location.href = `/signup?redirect_to=${encodeURIComponent(redirectTo)}`;
                  }}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create New Account
                </Button>
              </div>

              <p className="text-xs text-center text-[var(--color-text-muted)] mb-6">
                Sign in if you already have an account, or create a new one to activate your subscription
              </p>
            </>
          )}

          {isAuthenticated && intent?.status === "paid" && (
            <Button
              onClick={activateSubscription}
              disabled={activating}
              isLoading={activating}
              className="w-full"
              size="lg"
            >
              {activating ? "Activating..." : "Activate Subscription"}
            </Button>
          )}

          <div className="mt-6 pt-6 border-t border-[var(--color-surface-border)]">
            <Button
              variant="outline"
              onClick={() => router.push("/subscription")}
              className="w-full"
            >
              Go to Subscription Page
            </Button>
          </div>
        </Card>
      </main>
      <Footer />
    </>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <main className="min-h-screen pt-16 flex items-center justify-center animated-bg px-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            <p className="text-[var(--color-text-secondary)]">Loading...</p>
          </div>
        </main>
        <Footer />
      </>
    }>
      <ActivatePageContent />
    </Suspense>
  );
}

