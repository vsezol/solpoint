"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useInView } from "motion/react";
import { useRef } from "react";
import { MapPin, Users, Zap, Globe, MessageCircle, Star } from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Find Builders Near You",
    description: "Open any city on the map. See every Solana developer, founder, and enthusiast nearby.",
    gradient: "from-[var(--color-primary)] to-[var(--color-accent)]",
  },
  {
    icon: MessageCircle,
    title: "Connect Directly",
    description: "DM anyone. No awkward intros. Full profiles with roles, skills, and social links.",
    gradient: "from-[var(--color-accent)] to-[var(--color-secondary)]",
  },
  {
    icon: Globe,
    title: "Travel-Ready Networking",
    description: "Landing in a new city? Instantly plug into the local Solana community before you arrive.",
    gradient: "from-[var(--color-secondary)] to-[var(--color-primary)]",
  },
];

const stats = [
  { value: "50+", label: "Cities" },
  { value: "1000+", label: "Builders" },
  { value: "100+", label: "Events" },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative h-full"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-6 sm:p-8 transition-all duration-500 hover:border-[var(--color-primary)]/30 hover:shadow-lg hover:shadow-[var(--color-primary)]/5 h-full flex flex-col">
        {/* Glow effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_0%,rgba(20,241,149,0.08),transparent_60%)]" />

        <div className="relative z-10 flex flex-col flex-1">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${feature.gradient} mb-5`}>
            <feature.icon className="w-6 h-6 text-[var(--color-background)]" strokeWidth={2} />
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mb-3">
            {feature.title}
          </h3>

          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed mt-auto">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function StatsBar() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="flex justify-center gap-8 sm:gap-16 py-12"
    >
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
          className="text-center"
        >
          <div className="text-3xl sm:text-4xl font-bold text-gradient">{stat.value}</div>
          <div className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">{stat.label}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const steps = [
    { num: "01", title: "Sign up with X", desc: "One tap. Your profile is ready." },
    { num: "02", title: "Pin your location", desc: "Show up on the global map." },
    { num: "03", title: "Connect", desc: "Find and message builders anywhere." },
  ];

  return (
    <div ref={ref} className="mt-16 sm:mt-24">
      <motion.h3
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="text-center text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mb-12 sm:mb-16"
      >
        How it works
      </motion.h3>

      {/* Timeline */}
      <div className="relative max-w-3xl mx-auto">
        {/* Connecting line - vertical on mobile, horizontal on sm+ */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-secondary)] sm:left-0 sm:right-0 sm:top-5 sm:bottom-auto sm:w-auto sm:h-px sm:bg-gradient-to-r" />

        <div className="flex flex-col sm:flex-row sm:justify-between gap-10 sm:gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.2 }}
              className="relative pl-14 sm:pl-0 sm:text-center sm:flex-1"
            >
              {/* Checkpoint circle */}
              <div className="absolute left-0 top-0 sm:static sm:mx-auto sm:mb-4 w-10 h-10 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-background)] flex items-center justify-center z-10">
                <span className="text-xs font-bold text-[var(--color-primary)]">{step.num}</span>
              </div>

              <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                {step.title}
              </h4>
              <p className="text-sm text-[var(--color-text-secondary)]">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const bgOpacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <section id="features" ref={containerRef} className="relative z-10 py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium text-[var(--color-primary)] mb-3 tracking-wider uppercase"
          >
            Why SolPoint
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--color-text-primary)] leading-tight"
          >
            Networking, <span className="text-gradient">reimagined</span>
          </motion.h2>
        </div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Stats */}
        <StatsBar />

        {/* How it works */}
        <HowItWorks />
      </div>
    </section>
  );
}
