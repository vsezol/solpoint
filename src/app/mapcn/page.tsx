"use client";

import dynamic from "next/dynamic";
import { Header, Footer } from "@/components/layout";
import { Card } from "@/components/ui";
import { CountriesLayer } from "./countries-layer";
import { CitiesLayer } from "./cities-layer";

// Dynamic import for map component to avoid SSR issues with MapLibre GL
const Map = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.Map),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-secondary)]">Loading map...</p>
        </div>
      </div>
    ),
  }
);

const MapControls = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.MapControls),
  {
    ssr: false,
  }
);

export default function MapCnPage() {
  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-[var(--color-background)]">
        {/* Hero section */}
        <section className="py-12 text-center">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <svg
              className="absolute top-0 left-0 w-full h-48 opacity-30"
              viewBox="0 0 1200 200"
              fill="none"
            >
              <path
                d="M0 100 Q300 50 600 100 Q900 150 1200 100"
                stroke="url(#mapGrad)"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M0 120 Q300 170 600 120 Q900 70 1200 120"
                stroke="url(#mapGrad)"
                strokeWidth="1"
                fill="none"
                opacity="0.5"
              />
              <defs>
                <linearGradient id="mapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#14f195" />
                  <stop offset="50%" stopColor="#9945ff" />
                  <stop offset="100%" stopColor="#00d1ff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 inline-block bg-gradient-to-r from-[#00F58D] to-[#A73EFF] bg-clip-text text-transparent">
            MapCN Map
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Beautiful maps powered by MapLibre GL. Zero config, theme-aware, and fully interactive.
          </p>
        </section>

        {/* Map section */}
        <section className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="h-[500px] lg:h-[720px] rounded-xl overflow-hidden border border-[var(--color-surface-border)]">
            <Card className="h-full p-0 overflow-hidden mapcn-map-container" style={{ background: "#18E3C5" }}>
              <Map 
                center={[55, 35]} 
                zoom={4}
              >
                <CountriesLayer />
                <CitiesLayer />
                <MapControls 
                  showZoom={true}
                  showCompass={true}
                  showLocate={true}
                  showFullscreen={true}
                />
              </Map>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

