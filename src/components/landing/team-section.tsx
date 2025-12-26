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
    image: "/danich.jpeg",
  },
  {
    name: "Vsevolod",
    role: "CTO, Full Stack Developer",
    description:
      "Senior Full-Stack Developer, leverages over seven years of development experience — including deep expertise in Web3 and Solana.",
    image: "/vsevolod.jpeg",
  },
  {
    name: "Artem",
    role: "Senior Frontend Developer",
    description:
      "Senior Frontend Developer with experience in Web3 and passionate about Solana.",
    image: "/artem.jpg",
  },
];

export function TeamSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section className="py-24 relative z-10" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[var(--color-surface-border)]" />
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">
              Our Team
            </h2>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[var(--color-surface-border)]" />
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
            >
              <Card variant="bordered" className="p-8 h-full text-center">
                {/* Avatar */}
                <div className="relative w-72 h-72 mx-auto mb-6 rounded-xl overflow-hidden border-2 border-[var(--color-surface-border)]">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className={`object-cover ${member.name === "Daniel" ? "object-top" : ""}`}
                    style={member.name === "Daniel" ? { objectPosition: "center 20%" } : undefined}
                    onError={(e) => {
                      // Hide image if it fails to load
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>

                <div className="flex flex-col items-center gap-2 mb-4">
                  <h4 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                    {member.name}
                  </h4>
                  <span className="text-base text-[var(--color-text-muted)]">
                    {member.role}
                  </span>
                </div>

                <p className="text-base text-[var(--color-text-secondary)] leading-relaxed text-center mt-4">
                  {member.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

