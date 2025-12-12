"use client";

import { useState } from "react";
import { Header, Footer } from "@/components/layout";
import { EventCard } from "@/components/cards/event-card";
import { Button, Input, Badge } from "@/components/ui";
import { Search, Calendar, MapPin, Filter } from "lucide-react";
import { mockEvents } from "@/lib/mock-data";
import type { Event } from "@/types";

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isVip] = useState(false); // TODO: Get from auth context

  const eventTypes = [
    { value: "official", label: "Official" },
    { value: "community", label: "Community" },
    { value: "meetup", label: "Meetup" },
    { value: "private", label: "Private" },
  ];

  // Filter events
  const filteredEvents = mockEvents.filter((event) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !event.name.toLowerCase().includes(query) &&
        !event.city.toLowerCase().includes(query) &&
        !event.country.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (selectedType && event.event_type !== selectedType) {
      return false;
    }
    // Hide VIP events for non-VIP users
    if (!isVip && event.visibility === "vip_only") {
      return false;
    }
    return true;
  });

  // Separate upcoming and past events
  const now = new Date();
  const upcomingEvents = filteredEvents.filter(
    (e) => new Date(e.start_date) >= now
  );
  const pastEvents = filteredEvents.filter((e) => new Date(e.start_date) < now);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        {/* Hero */}
        <section className="py-12 text-center animated-bg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-gradient mb-4">
              Solana Events
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
              Discover meetups, conferences, and gatherings in the Solana
              ecosystem worldwide.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="w-full sm:w-96">
              <Input
                placeholder="Search events..."
                icon={<Search className="w-4 h-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType(null)}
                className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                  !selectedType
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                }`}
              >
                All Events
              </button>
              {eventTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                    selectedType === type.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[var(--color-primary)]" />
            Upcoming Events
          </h2>

          {upcomingEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} isVip={isVip} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)]">
                No upcoming events found
              </p>
            </div>
          )}
        </section>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-[var(--color-text-muted)]" />
              Past Events
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70">
              {pastEvents.map((event) => (
                <EventCard key={event.id} event={event} isVip={isVip} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

