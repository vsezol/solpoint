"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Header, Footer } from "@/components/layout";
import { MapFiltersPanel } from "@/components/map";
import type { MapFilters, MapMarker } from "@/types";
import { getMapMarkers } from "@/lib/api/map";
import { useAuth } from "@/hooks/use-auth";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFilters>({
    showUsers: true,
    showEvents: true,
    showHubs: true,
    contentType: "all",
  });
  const { user } = useAuth();
  const isVip = user?.subscription_tier === "vip";
  const isAuthenticated = !!user;

  // Загружаем маркеры при изменении фильтров
  useEffect(() => {
    async function loadMarkers() {
      try {
        setLoading(true);
        setError(null);
        const allMarkers = await getMapMarkers(filters, user?.id);
        setMarkers(allMarkers);
      } catch (err) {
        console.error("Error loading map markers:", err);
        setError("Failed to load map data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadMarkers();
  }, [filters, user?.id]);

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

          <h1 className="text-4xl sm:text-5xl font-bold text-gradient mb-4 inline-block">
            SolPoint Map
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Discover Solana Users, Hubs, and Events Around the World.
          </p>
        </section>

        {/* Map section */}
        <section className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters sidebar */}
            <aside className="w-full lg:w-[320px] lg:flex-shrink-0">
              <MapFiltersPanel
                filters={filters}
                onFiltersChange={setFilters}
                isVip={isVip}
              />
            </aside>

            {/* Map */}
            <div className="flex-1">
              <div className="h-[500px] lg:h-[720px] rounded-xl overflow-hidden border border-[var(--color-surface-border)]">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface)]">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[var(--color-text-secondary)]">Loading map data...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface)]">
                    <div className="text-center">
                      <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <SolPointMap
                    markers={markers}
                    center={[35, 55]}
                    zoom={4}
                    isVip={isVip}
                    isAuthenticated={isAuthenticated}
                    currentUserId={user?.id}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

