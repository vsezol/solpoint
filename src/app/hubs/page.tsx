"use client";

import { useState } from "react";
import { Header, Footer } from "@/components/layout";
import { HubCard } from "@/components/cards/hub-card";
import { Input } from "@/components/ui";
import { Search, Users, Globe } from "lucide-react";
import { mockHubs } from "@/lib/mock-data";

export default function HubsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter hubs
  const filteredHubs = mockHubs.filter((hub) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !hub.name.toLowerCase().includes(query) &&
        !hub.country.toLowerCase().includes(query) &&
        !(hub.city?.toLowerCase().includes(query))
      ) {
        return false;
      }
    }
    return true;
  });

  // Calculate total members
  const totalMembers = mockHubs.reduce((acc, hub) => acc + hub.members_count, 0);
  const totalCountries = new Set(mockHubs.map((hub) => hub.country)).size;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        {/* Hero */}
        <section className="py-12 text-center animated-bg">
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
          {filteredHubs.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHubs.map((hub) => (
                <HubCard key={hub.id} hub={hub} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)]">
                No hubs found
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

