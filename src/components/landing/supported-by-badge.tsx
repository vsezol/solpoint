"use client";

import { motion } from "motion/react";
import { useInView } from "motion/react";
import { useRef } from "react";

export function SupportedByBadge() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div ref={ref} className="relative z-10 flex justify-center -mt-8 mb-4 md:mb-8 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)]/80 backdrop-blur-md shadow-lg shadow-[var(--color-primary)]/5"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse-glow" />
        <span className="text-xs sm:text-sm font-medium text-[var(--color-text-secondary)]">
          Supported by{" "}
          <span className="text-[var(--color-text-primary)] font-semibold">Superteam KZ</span>
          {" & "}
          <span className="text-[var(--color-text-primary)] font-semibold">Encode Club</span>
        </span>
      </motion.div>
    </div>
  );
}
