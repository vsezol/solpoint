"use client";

import { useState } from "react";
import { Header, Footer } from "@/components/layout";
import { Button, Card, Badge } from "@/components/ui";
import {
  Crown,
  Check,
  MapPin,
  MessageCircle,
  Users,
  Calendar,
  Wallet,
  Shield,
} from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "0",
    period: "forever",
    description: "Basic access to the Solana community map",
    features: [
      { text: "View users by country", included: true },
      { text: "See official events", included: true },
      { text: "Access public hubs", included: true },
      { text: "View city-level locations", included: false },
      { text: "See user profiles & bios", included: false },
      { text: "Send direct messages", included: false },
      { text: "Access private events", included: false },
      { text: "Advanced filters", included: false },
    ],
    cta: "Current Plan",
    highlighted: false,
  },
  {
    name: "VIP",
    price: "5",
    period: "month",
    description: "Full access to unlock the power of Solana networking",
    features: [
      { text: "View users by country", included: true },
      { text: "See official events", included: true },
      { text: "Access public hubs", included: true },
      { text: "View city-level locations", included: true },
      { text: "See user profiles & bios", included: true },
      { text: "Send direct messages", included: true },
      { text: "Access private events", included: true },
      { text: "Advanced filters", included: true },
    ],
    cta: "Upgrade to VIP",
    highlighted: true,
  },
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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setIsLoading(true);
    // TODO: Implement Solana Pay integration
    console.log("Initiating Solana Pay...");
    setTimeout(() => setIsLoading(false), 2000);
  };

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
          <div className="grid md:grid-cols-2 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.name}
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
                      {plan.price === "0" ? "Free" : `${plan.price} SOL`}
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
                    plan.highlighted
                      ? "bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90 text-[var(--color-background)]"
                      : ""
                  }`}
                  variant={plan.highlighted ? "primary" : "outline"}
                  size="lg"
                  disabled={!plan.highlighted}
                  isLoading={isLoading && plan.highlighted}
                  onClick={plan.highlighted ? handleUpgrade : undefined}
                >
                  {plan.highlighted && <Crown className="w-5 h-5 mr-2" />}
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>
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
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <Card variant="bordered" className="p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Wallet className="w-6 h-6 text-[var(--color-primary)]" />
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Pay with Solana
              </h3>
            </div>
            <p className="text-[var(--color-text-secondary)] mb-6">
              VIP subscriptions are paid directly with SOL using Solana Pay.
              Connect your wallet and upgrade instantly.
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
                Phantom & Solflare
              </div>
            </div>
          </Card>
        </section>
      </main>
      <Footer />
    </>
  );
}

