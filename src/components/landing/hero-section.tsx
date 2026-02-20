"use client";

import { Button } from "@/components/ui";
import dynamic from "next/dynamic";
import Link from "next/link";

const RotatingPlanetCanvas = dynamic(
  () => import("./rotating-planet-canvas-branching").then((mod) => mod.RotatingPlanetCanvas),
  {
    ssr: false,
    loading: () => <div className="h-full w-full" aria-hidden />,
  }
);

export function HeroSection() {
  return (
    <section className="relative min-h-screen pt-16 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_36%,rgba(143,100,255,0.18),transparent_52%),radial-gradient(circle_at_74%_60%,rgba(20,241,149,0.15),transparent_56%)]" />
        <div className="absolute inset-x-0 top-[8vh] flex justify-center md:left-auto md:right-0 md:top-1/2 md:-translate-y-1/2 md:justify-end md:pr-1 lg:pr-4 xl:pr-6">
          <div className="pointer-events-auto h-[360px] w-[360px] sm:h-[520px] sm:w-[520px] md:h-[520px] md:w-[520px] lg:h-[620px] lg:w-[620px] xl:h-[700px] xl:w-[700px] 2xl:h-[760px] 2xl:w-[760px] opacity-80 sm:opacity-86 lg:opacity-92">
            <RotatingPlanetCanvas />
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col justify-end px-4 pb-8 sm:px-6 sm:pb-10 md:justify-center md:px-8 md:pb-0 md:pt-20">
        <div className="max-w-2xl space-y-5 lg:max-w-3xl lg:pr-16">
          <h1
            className="max-w-2xl text-4xl font-bold leading-[120%] tracking-normal text-(--color-text-primary) sm:text-5xl md:text-[44px]"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Connect, Network, Attend:
            <br />
            <span className="whitespace-normal sm:whitespace-nowrap">Join the Global Community</span>
          </h1>

          <p
            className="max-w-xl text-base font-normal leading-[1.6] tracking-normal text-(--color-text-secondary) sm:text-lg sm:leading-[1.8]"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            A live map of builders, communities, and events. Open any city, find
            your people, and plug in instantly.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4">
            <Button size="lg" className="glow-primary w-full sm:w-auto" asChild>
              <Link href="/map">Open SolPoint Map</Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
              <Link href="/about">See How It Works</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

