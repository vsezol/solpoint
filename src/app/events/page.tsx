"use client";

import { useState, useEffect } from "react";
import { Header, Footer } from "@/components/layout";
import { EventCard } from "@/components/cards/event-card";
import { Button, Input } from "@/components/ui";
import { Search, Calendar } from "lucide-react";
import { getEvents, filterEventsBySearch } from "@/lib/api/events";
import type { Event } from "@/types";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isVip] = useState(false); // TODO: Get from auth context

  const eventTypes = [
    { value: "official", label: "Official" },
    { value: "community", label: "Community" },
    { value: "meetup", label: "Meetup" },
    { value: "private", label: "Private" },
  ];

  // Fetch events from API
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);

        const filters: Parameters<typeof getEvents>[0] = {
          upcoming: false, // Get all events, we'll filter by date on client
        };

        if (selectedType) {
          filters.event_type = selectedType as "official" | "community" | "private" | "meetup";
        }

        const fetchedEvents = await getEvents(filters);
        setEvents(fetchedEvents);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Failed to load events. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [selectedType]);

  // Filter events by search query
  const searchFilteredEvents = filterEventsBySearch(events, searchQuery);

  // Separate upcoming and past events
  const now = new Date();
  const upcomingEvents = searchFilteredEvents.filter(
    (e) => new Date(e.start_date) >= now
  );
  const pastEvents = searchFilteredEvents.filter((e) => new Date(e.start_date) < now);

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
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="w-full sm:w-96">
              <Input
                placeholder="Search events..."
                icon={<Search className="w-4 h-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setSelectedType(null)}
                className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                  !selectedType
                    ? "bg-[var(--color-primary)] text-[var(--color-background)] border-[var(--color-primary)]"
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
                      ? "bg-[var(--color-primary)] text-[var(--color-background)] border-[var(--color-primary)]"
                      : "border-[var(--color-surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <Button variant="primary" className="whitespace-nowrap">
                Host an event
              </Button>
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[var(--color-primary)]" />
            Upcoming Events
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
              <p className="mt-4 text-[var(--color-text-secondary)]">
                Loading events...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-error)] mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : upcomingEvents.length > 0 ? (
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

