"use client";

import { motion } from "motion/react";
import { useInView } from "motion/react";
import Image from "next/image";
import { useRef } from "react";
export function AboutSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section id="about" className="py-24 relative z-10" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[var(--color-surface-border)]" />
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">
              About Us
            </h2>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[var(--color-surface-border)]" />
          </div>
        </motion.div>

        {/* Our Story */}
        <div className="grid lg:grid-cols-2 gap-12 items-start mb-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Our story
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
                Why We Started
              </h3>
            </div>

            {/* Decorative 3D shape */}
            <div className="relative w-fit">
              <Image 
                src="/sol-crendel.webp" 
                alt="Solana Crendel"
                width={450}
                height={445}
                className="object-contain"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4 text-[var(--color-text-secondary)]"
          >
            <p>
              The year 2025 marked an undeniable turning point: the Solana
              ecosystem&apos;s growth accelerated, bringing with it a vibrant culture
              of{" "}
              <strong className="text-[var(--color-text-primary)]">
                in-person meetups, gatherings, and IRL events worldwide
              </strong>
              .
            </p>
            <p>
              Yet, we recognized a major disconnect: a massive, unmet demand for
              effective, local networking. The only proven path to making
              meaningful connections was through attending large, international
              conferences like Breakpoint.
            </p>
            <p>
              This meant that building a network required significant time,
              expense, and mandatory travel across continents.
            </p>
            <p className="font-semibold text-[var(--color-text-primary)]">
              SolPoint is our direct answer to this fundamental challenge.
            </p>
            <p>
              We engineered a platform that completely removes the geographical
              barriers to Solana networking. We{" "}
              <strong className="text-[var(--color-text-primary)]">
                bridge the gap between the digital community and the real world
              </strong>
              , ensuring you can connect instantly, wherever you are.
            </p>

            <div className="pt-4 space-y-3">
              <p className="font-medium text-[var(--color-text-primary)]">
                SolPoint allows you to:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)]">•</span>
                  <span>
                    <strong className="text-[var(--color-text-primary)]">
                      For Residents:
                    </strong>{" "}
                    Effortlessly find every Solana professional and enthusiast
                    located in your home country or city.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)]">•</span>
                  <span>
                    <strong className="text-[var(--color-text-primary)]">
                      For Travelers:
                    </strong>{" "}
                    Instantly plug into the local community and make connections
                    the moment you land in a new destination.
                  </span>
                </li>
              </ul>
            </div>

            <p>
              Stop relying on luck and endless Twitter scrolling. With our
              interactive map, you can pinpoint industry contacts and{" "}
              <strong className="text-[var(--color-text-primary)]">
                expand your network in seconds
              </strong>
              . SolPoint is your definitive,{" "}
              <strong className="text-[var(--color-text-primary)]">
                local key to the global Solana community
              </strong>
              .
            </p>
          </motion.div>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-4"
          >
            <h4 className="text-xl font-medium text-[var(--color-primary)]">
              Our Mission
            </h4>
            <p className="text-[var(--color-text-secondary)]">
              Our mission is to{" "}
              <strong className="text-[var(--color-text-primary)]">
                make networking within the Solana ecosystem maximally easy and
                productive
              </strong>
              . We eliminate the need to waste precious time scrolling social
              media in search of contacts. SolPoint instantly transforms the
              global community into strong, localized connections, accessible to
              you in seconds.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="space-y-4"
          >
            <h4 className="text-xl font-medium text-[var(--color-primary)]">
              Our Vision
            </h4>
            <p className="text-[var(--color-text-secondary)]">
              Our vision is a future where the Solana ecosystem thrives through
              seamless, localized connectivity. SolPoint will be the definitive,
              global infrastructure that empowers every member to instantly
              meet, collaborate, and innovate, ensuring that the next major{" "}
              <strong className="text-[var(--color-text-primary)]">
                Solana breakthrough can be sparked anywhere in the world
              </strong>
              .
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

