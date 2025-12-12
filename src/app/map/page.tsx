"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Header, Footer } from "@/components/layout";
import { MapFiltersPanel } from "@/components/map";
import type { MapFilters, MapMarker } from "@/types";
import { getMockMarkers } from "@/lib/mock-data";

// Dynamic import for map component to avoid SSR issues with Leaflet
const SolPointMap = dynamic(
  () => import("@/components/map/solpoint-map").then((mod) => mod.SolPointMap),
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

export default function MapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [filters, setFilters] = useState<MapFilters>({
    showUsers: true,
    showEvents: true,
    showHubs: true,
  });
  const [isVip] = useState(false); // TODO: Get from auth context

  useEffect(() => {
    // Load mock data
    const allMarkers = getMockMarkers();
    setMarkers(allMarkers);
  }, []);

  // Filter markers based on filters
  const filteredMarkers = markers.filter((marker) => {
    if (marker.type === "user" || marker.type === "vip_user") {
      if (!filters.showUsers) return false;
    }
    if (marker.type === "event") {
      if (!filters.showEvents) return false;
    }
    if (marker.type === "hub") {
      if (!filters.showHubs) return false;
    }
    return true;
  });

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

          <h1 className="text-4xl sm:text-5xl font-bold text-gradient mb-4">
            SolPoint Map
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Discover Solana Users, Hubs, and Events Around the World.
          </p>
        </section>

        {/* Map section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid lg:grid-cols-[300px,1fr] gap-6">
            {/* Filters sidebar */}
            <aside className="order-2 lg:order-1">
              <MapFiltersPanel
                filters={filters}
                onFiltersChange={setFilters}
                isVip={isVip}
              />
            </aside>

            {/* Map */}
            <div className="order-1 lg:order-2">
              <div className="h-[500px] lg:h-[600px] rounded-xl overflow-hidden border border-[var(--color-surface-border)]">
                <SolPointMap
                  markers={filteredMarkers}
                  center={[35, 55]}
                  zoom={4}
                  isVip={isVip}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

