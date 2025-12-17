"use client";

import { Button } from "@/components/ui";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-0">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h1 
              className="text-[40px] font-bold leading-[130%] tracking-normal text-[var(--color-text-primary)] max-w-2xl"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Connect, Network, Attend:
              <br />
              <span className="whitespace-nowrap">The Global Solana Community Map.</span>
            </h1>

            <p 
              className="text-[18px] font-normal leading-[30px] tracking-normal text-[var(--color-text-secondary)] max-w-xl"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Landing in a new country and looking to connect with the local Solana
              community?
            </p>

            <p 
              className="text-[18px] font-normal leading-[30px] tracking-normal text-[var(--color-text-secondary)] max-w-xl"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
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
            <div className="relative w-full aspect-square max-w-2xl mx-auto animate-float">
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

