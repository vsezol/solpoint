"use client";

import { useState, useEffect } from "react";
import { Header, Footer } from "@/components/layout";
import { HubCard } from "@/components/cards/hub-card";
import { Input } from "@/components/ui";
import { Search, Users, Globe } from "lucide-react";
import { getHubs } from "@/lib/api/hubs";
import type { Hub } from "@/types";

export default function HubsPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch hubs from API
  useEffect(() => {
    async function fetchHubs() {
      try {
        setLoading(true);
        setError(null);

        const filters: Parameters<typeof getHubs>[0] = {};
        
        // Если есть поисковый запрос, отправляем его на сервер
        if (searchQuery.trim()) {
          filters.search = searchQuery.trim();
        }

        const fetchedHubs = await getHubs(filters);
        setHubs(fetchedHubs);
      } catch (err) {
        console.error("Error fetching hubs:", err);
        setError("Не удалось загрузить хабы. Попробуйте позже.");
      } finally {
        setLoading(false);
      }
    }

    // Добавляем небольшую задержку для поиска (debounce)
    // При первой загрузке (пустой searchQuery) загружаем сразу
    const timeoutId = setTimeout(() => {
      fetchHubs();
    }, searchQuery.trim() ? 300 : 0);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Calculate total members and countries from fetched hubs
  const totalMembers = hubs.reduce((acc, hub) => acc + hub.members_count, 0);
  const totalCountries = new Set(hubs.map((hub) => hub.country)).size;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-16 animated-bg">
        {/* Hero */}
        <section className="py-12 text-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-gradient mb-4">
              Solana Hubs
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-8">
              Connect with local Solana communities and Superteam chapters
              around the world.
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-[var(--color-primary)]">
                  <Users className="w-5 h-5" />
                  <span className="text-2xl font-bold">{totalMembers.toLocaleString()}</span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Total Members
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-[var(--color-secondary)]">
                  <Globe className="w-5 h-5" />
                  <span className="text-2xl font-bold">{totalCountries}</span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Countries
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-md mx-auto">
            <Input
              placeholder="Search hubs by name or country..."
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>

        {/* Hubs Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[var(--color-surface)] rounded-lg p-6 animate-pulse"
                >
                  <div className="h-4 bg-[var(--color-surface-border)] rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-[var(--color-surface-border)] rounded w-full mb-2"></div>
                  <div className="h-3 bg-[var(--color-surface-border)] rounded w-5/6"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-error)] mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-background)] rounded-lg hover:opacity-90 transition-opacity"
              >
                Попробовать снова
              </button>
            </div>
          ) : hubs.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hubs.map((hub) => (
                <HubCard key={hub.id} hub={hub} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)]">
                {searchQuery.trim() ? "Хабы не найдены по вашему запросу" : "Хабы не найдены"}
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

