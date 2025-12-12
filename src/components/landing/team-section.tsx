"use client";

import { Card } from "@/components/ui";
import { motion } from "motion/react";
import { useInView } from "motion/react";
import { useRef } from "react";
import Image from "next/image";

const teamMembers = [
  {
    name: "Daniel",
    role: "CEO, Founder",
    description:
      "Brings proven founder experience — having successfully scaled a Web3 wallet/token analysis tool from idea to $80k in monthly revenue.",
    image: "/team/daniel.jpg",
  },
  {
    name: "Vsevolod",
    role: "CTO, Full Stack Developer",
    description:
      "Senior Full-Stack Developer, leverages over seven years of development experience — including deep expertise in Web3 and Solana.",
    image: "/team/vsevolod.jpg",
  },
];

export function TeamSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section className="py-24 bg-[var(--color-background)]" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h3 className="text-sm font-medium text-[var(--color-primary)] underline mb-4">
            Our Team
          </h3>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
            >
              <Card variant="bordered" className="text-center p-6 h-full">
                {/* Avatar placeholder */}
                <div className="relative w-24 h-24 mx-auto mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-secondary)]/20">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      // Fallback to gradient if image fails
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  {/* Decorative 3D blob */}
                  <svg
                    viewBox="0 0 100 100"
                    className="absolute inset-0 w-full h-full"
                  >
                    <defs>
                      <linearGradient
                        id={`teamGrad${index}`}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#14f195" />
                        <stop offset="50%" stopColor="#9945ff" />
                        <stop offset="100%" stopColor="#00d1ff" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M50 10 C70 15 85 30 90 50 C85 70 70 85 50 90 C30 85 15 70 10 50 C15 30 30 15 50 10 Z"
                      fill="none"
                      stroke={`url(#teamGrad${index})`}
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  </svg>
                </div>

                <div className="flex items-center justify-center gap-3 mb-2">
                  <h4 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {member.name}
                  </h4>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {member.role}
                  </span>
                </div>

                <p className="text-sm text-[var(--color-text-secondary)]">
                  {member.description}
                </p>
              </Card>
            </motion.div>
          ))}

          {/* Center placeholder for 3-column layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="hidden lg:block"
          >
            <Card variant="bordered" className="h-full flex items-center justify-center p-6">
              <div className="text-center">
                {/* 3D decorative element */}
                <svg viewBox="0 0 100 100" className="w-32 h-32 mx-auto">
                  <defs>
                    <linearGradient id="centerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#14f195" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#9945ff" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#00d1ff" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                  {/* Twisted torus/mobius shape */}
                  <ellipse
                    cx="50"
                    cy="50"
                    rx="35"
                    ry="20"
                    fill="none"
                    stroke="url(#centerGrad)"
                    strokeWidth="3"
                    transform="rotate(-15 50 50)"
                  />
                  <ellipse
                    cx="50"
                    cy="50"
                    rx="35"
                    ry="20"
                    fill="none"
                    stroke="url(#centerGrad)"
                    strokeWidth="3"
                    transform="rotate(45 50 50)"
                  />
                  <ellipse
                    cx="50"
                    cy="50"
                    rx="35"
                    ry="20"
                    fill="none"
                    stroke="url(#centerGrad)"
                    strokeWidth="3"
                    transform="rotate(105 50 50)"
                  />
                </svg>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

