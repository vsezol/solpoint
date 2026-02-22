"use client";

import { Button } from "@/components/ui";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

const RotatingPlanetCanvas = dynamic(
  () => import("./rotating-planet-canvas-branching").then((mod) => mod.RotatingPlanetCanvas),
  {
    ssr: false,
    loading: () => <div className="h-full w-full" aria-hidden />,
  }
);

export function HeroSection() {
  return (
    <section className="relative min-h-[100svh] pt-0 md:pt-16 overflow-hidden flex flex-col">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_36%,rgba(143,100,255,0.18),transparent_52%),radial-gradient(circle_at_74%_60%,rgba(20,241,149,0.15),transparent_56%)]" />
      </div>

      {/* Planet - centered on mobile, right on desktop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-[6vh] flex justify-center md:left-auto md:right-0 md:top-1/2 md:-translate-y-1/2 md:justify-end md:pr-1 lg:pr-4 xl:pr-6">
          <div className="pointer-events-auto h-[340px] w-[340px] sm:h-[400px] sm:w-[400px] md:h-[520px] md:w-[520px] lg:h-[620px] lg:w-[620px] xl:h-[700px] xl:w-[700px] 2xl:h-[760px] 2xl:w-[760px] opacity-70 sm:opacity-80 lg:opacity-92">
            <RotatingPlanetCanvas />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 mx-auto flex flex-1 w-full max-w-7xl flex-col justify-end px-4 pb-16 sm:px-6 md:justify-center md:px-8 md:pb-0 md:pt-20">
        <div className="max-w-2xl space-y-4 lg:max-w-3xl lg:pr-16">
          <h1
            className="text-3xl font-bold leading-[1.15] tracking-tight text-[var(--color-text-primary)] sm:text-5xl md:text-[44px]"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Your Map to the
            <br />
            <span className="text-gradient">Solana Ecosystem</span>
          </h1>

          <p
            className="max-w-md text-base font-normal leading-relaxed text-[var(--color-text-secondary)] sm:text-lg"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Find builders, communities, and events in any city. Connect instantly.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
            <Button size="lg" className="glow-primary w-full sm:w-auto" asChild>
              <Link href="/map">Open Map</Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
              <Link href="/subscription">Go PRO</Link>
            </Button>
          </div>

          {/* Supported by badge - desktop only */}
          <div className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              Supported by{" "}
              <span className="text-[var(--color-text-primary)] font-semibold">Superteam KZ</span>
              {" & "}
              <span className="text-[var(--color-text-primary)] font-semibold">Encode Club</span>
            </span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="relative z-20 flex justify-center pb-8 md:pb-10">
        <button
          onClick={() => {
            document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex flex-col items-center gap-2 group"
          aria-label="Scroll down"
        >
          <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
            Scroll to explore
          </span>
          <ChevronDown className="w-7 h-7 text-[var(--color-primary)] animate-bounce drop-shadow-[0_0_6px_rgba(20,241,149,0.5)]" />
        </button>
      </div>
    </section>
  );
}
