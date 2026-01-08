"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Header, Footer } from "@/components/layout";
import { Card } from "@/components/ui";
import { MapFiltersPanel } from "@/components/map";
import type { MapFilters, MapMarker } from "@/types";
import { getMapMarkers } from "@/lib/api/map";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { WaterLayer } from "./water-layer";
import { CountriesLayer } from "./countries-layer";
import { MapMarkersLayer } from "./markers-layer";

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
  const router = useRouter();
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFilters>({
    showUsers: true,
    showEvents: true,
    showHubs: true,
    showCommunities: true,
    showWorkspaces: true,
    contentType: "all",
  });
  const { user } = useAuth();
  const isVip = user?.subscription_tier === "vip";
  const isAuthenticated = !!user;

  // Отслеживаем просмотр карты
  useEffect(() => {
    // Вызываем trackEvent асинхронно, чтобы не блокировать загрузку страницы
    setTimeout(() => {
      trackEvent("map_view", {
        event_category: "Map",
        is_vip: isVip,
        is_authenticated: isAuthenticated,
      });
    }, 0);
  }, [isVip, isAuthenticated]);

  // Загружаем маркеры при изменении фильтров
  useEffect(() => {
    async function loadMarkers() {
      try {
        setLoading(true);
        setError(null);
        const allMarkers = await getMapMarkers(filters, user?.id, isVip);
        setMarkers(allMarkers);
      } catch (err) {
        console.error("Error loading map markers:", err);
        setError("Failed to load map data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadMarkers();
  }, [filters, user?.id, isVip]);

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
            Solana Map
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
                        onClick={() => router.refresh()}
                        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <Card className="h-full p-0 overflow-hidden mapcn-map-container" style={{ background: "#18E3C5" }}>
                    <Map 
                      center={[55, 35]} 
                      zoom={4}
                    >
                      <WaterLayer />
                      <CountriesLayer landColor="#8B5CF6" />
                      <MapMarkersLayer
                        markers={markers}
                        isVip={isVip}
                        isAuthenticated={isAuthenticated}
                        currentUserId={user?.id}
                      />
                      <MapControls 
                        showZoom={true}
                        showCompass={true}
                        showLocate={true}
                        showFullscreen={true}
                      />
                    </Map>
                  </Card>
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

