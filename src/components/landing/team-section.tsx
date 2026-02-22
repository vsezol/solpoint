"use client";

import { motion } from "motion/react";
import { useInView } from "motion/react";
import { useRef } from "react";
import Image from "next/image";

const teamMembers = [
  {
    name: "Daniel",
    role: "CEO, Founder",
    description: "Scaled a Web3 analytics tool to $80k MRR. Proven builder.",
    image: "/danich.jpeg",
    imagePosition: "center 20%",
  },
  {
    name: "Vsevolod",
    role: "CTO, Full Stack",
    description: "7+ years in dev. Deep Web3 & Solana expertise.",
    image: "/vsevolod.jpeg",
    imagePosition: "center",
  },
  {
    name: "Artem",
    role: "Senior Frontend",
    description: "Frontend specialist. Web3 native. Solana enthusiast.",
    image: "/artem.jpg",
    imagePosition: "center",
  },
];

function TeamCard({ member, index }: { member: typeof teamMembers[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)]/40 backdrop-blur-sm transition-all duration-500 hover:border-[var(--color-primary)]/20 hover:shadow-xl hover:shadow-[var(--color-primary)]/5">
        {/* Image */}
        <div className="relative h-64 sm:h-72 overflow-hidden">
          <Image
            src={member.image}
            alt={member.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            style={{ objectPosition: member.imagePosition }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-transparent" />
        </div>

        {/* Info */}
        <div className="relative p-5 -mt-8">
          <h4 className="text-xl font-bold text-[var(--color-text-primary)]">
            {member.name}
          </h4>
          <p className="text-sm font-medium text-[var(--color-primary)] mt-0.5">
            {member.role}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2 leading-relaxed">
            {member.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function TeamSection() {
  return (
    <section className="py-16 sm:py-24 relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-[var(--color-primary)] mb-3 tracking-wider uppercase">
            The Team
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">
            Built by builders
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {teamMembers.map((member, index) => (
            <TeamCard key={member.name} member={member} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
