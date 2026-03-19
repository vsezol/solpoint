"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { Header, Footer } from "@/components/layout";
import { Card } from "@/components/ui";
import { getMapMarkers } from "@/lib/api/map";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";
import type { MapFilters, MapMarker } from "@/types";

import { MapFiltersPanelV2, MAP_V2_DEFAULT_FILTERS } from "./map-filters-v2";

const WaterLayer = dynamic(
  () => import("../../app/mapcn/water-layer").then((mod) => ({ default: mod.WaterLayer })),
  { ssr: false }
);

const CountriesLayer = dynamic(
  () => import("../../app/mapcn/countries-layer").then((mod) => ({ default: mod.CountriesLayer })),
  { ssr: false }
);

const MapMarkersLayer = dynamic(
  () => import("../../app/mapcn/markers-layer").then((mod) => ({ default: mod.MapMarkersLayer })),
  { ssr: false }
);

const Map = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.Map),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#0F1115]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#14f195] border-t-transparent" />
      </div>
    ),
  }
);

const MapControls = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.MapControls),
  { ssr: false }
);

const kodeMonoStyle = {
  fontFamily: "var(--font-kode-mono), monospace",
} as const;

export function MapPageV2() {
  const router = useRouter();
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFilters>(MAP_V2_DEFAULT_FILTERS);

  const { user } = useAuth();
  const isVip = user?.subscription_tier === "vip";
  const isAuthenticated = !!user;

  useEffect(() => {
    setTimeout(() => {
      trackEvent("map_v2_view", {
        event_category: "Map",
        is_vip: isVip,
        is_authenticated: isAuthenticated,
      });
    }, 0);
  }, [isVip, isAuthenticated]);

  useEffect(() => {
    async function loadMarkers() {
      try {
        setLoading(true);
        setError(null);
        const allMarkers = await getMapMarkers(filters, user?.id, isVip);
        setMarkers(allMarkers);
      } catch (loadError) {
        console.error("Error loading map v2 markers:", loadError);
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
      <main className="min-h-screen bg-black pb-16 pt-[84px]">
        <section className="mx-auto max-w-[1280px] px-4 pb-14 md:px-8 md:pb-20">
          <div className="pb-8 pt-10 text-center md:pb-12 md:pt-14">
            <h1 className="mx-auto max-w-[1040px] text-[35px] font-bold leading-none tracking-[0] text-white" style={kodeMonoStyle}>
              See who from the Solana community is nearby
            </h1>
            <p
              className="mx-auto mt-4 max-w-[920px] text-[20px] font-bold leading-none tracking-[0] text-white/90"
              style={kodeMonoStyle}
            >
              Find people around you, explore who&apos;s relevant, and start connecting.
            </p>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-5">
            <aside className="w-full lg:w-[300px] lg:shrink-0">
              <MapFiltersPanelV2 filters={filters} onFiltersChange={setFilters} />
            </aside>

            <div className="w-full flex-1 lg:max-w-[934px]">
              <div className="h-[360px] overflow-hidden rounded-[20px] border border-[#2A2A2A] bg-[#18E3C5] sm:h-[440px] md:h-[520px] lg:h-[582px] lg:rounded-[26px]">
                {loading ? (
                  <div className="flex h-full w-full items-center justify-center bg-[#111318]">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#14f195] border-t-transparent" />
                  </div>
                ) : error ? (
                  <div className="flex h-full w-full items-center justify-center bg-[#111318] px-6">
                    <div className="text-center">
                      <p
                        className="text-[16px] font-normal leading-[1.3] text-white/85 md:text-[20px]"
                        style={kodeMonoStyle}
                      >
                        {error}
                      </p>
                      <button
                        type="button"
                        onClick={() => router.refresh()}
                        className="mt-4 border border-[#14f195] px-4 py-2 text-[16px] font-semibold leading-none text-[#14f195] transition-colors hover:bg-[#14f195]/10"
                        style={kodeMonoStyle}
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <Card className="mapcn-map-container h-full overflow-hidden rounded-none border-0 p-0" style={{ background: "#18E3C5" }}>
                    <Map center={[55, 72]} zoom={3.35}>
                      <WaterLayer />
                      <CountriesLayer landColor="#4A31AA" />
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
                        position="bottom-right"
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
