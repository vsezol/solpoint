"use client";

import { Button } from "@/components/ui";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 animated-bg" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-secondary)]/10 rounded-full blur-3xl" />
      
      {/* Animated lines background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg
          className="absolute top-0 left-0 w-full h-full opacity-20"
          viewBox="0 0 1200 800"
          fill="none"
        >
          <path
            d="M0 400 Q300 300 600 400 Q900 500 1200 400"
            stroke="url(#heroGrad)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0 200 Q300 300 600 200 Q900 100 1200 200"
            stroke="url(#heroGrad)"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />
          <defs>
            <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14f195" />
              <stop offset="50%" stopColor="#9945ff" />
              <stop offset="100%" stopColor="#00d1ff" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-[var(--color-text-primary)]">
                Connect, Network, Attend:
              </span>
              <br />
              <span className="text-gradient">
                The Global Solana Community Map.
              </span>
            </h1>

            <p className="text-lg text-[var(--color-text-secondary)] max-w-xl">
              Landing in a new country and looking to connect with the local
              Solana community?
            </p>

            <p className="text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">
                SolPoint
              </span>{" "}
              is the global interactive map that instantly reveals all Solana
              enthusiasts, local hubs, and active events, wherever your journey
              takes you.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" className="glow-primary" asChild>
                <Link href="/map">Explore The Map</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/about">Learn More</Link>
              </Button>
            </div>
          </motion.div>

          {/* Globe illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative w-full aspect-square max-w-lg mx-auto animate-float">
              <Image
                src="/hero-globe.svg"
                alt="Global Solana Community"
                fill
                className="object-contain"
                priority
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

