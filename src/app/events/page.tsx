"use client";

import { useState, useEffect, useRef } from "react";
import { Header, Footer } from "@/components/layout";
import { EventCard, EventCardSkeleton } from "@/components/cards";
import { Button, Input, Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, FilterTag, ProSubscriptionModal } from "@/components/ui";
import { AuthRequiredModal } from "@/components/ui/auth-required-modal";
import { CreateEventForm } from "@/components/ui/create-event-form";
import { Search, Calendar } from "lucide-react";
import { getEvents, filterEventsBySearch } from "@/lib/api/events";
import type { Event } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const isVip = user?.subscription_tier === "vip";
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const analyticsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Дебаунс для аналитики поиска (500ms)
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (analyticsTimeoutRef.current) {
      clearTimeout(analyticsTimeoutRef.current);
    }

    // Отправляем аналитику только если есть поисковый запрос
    if (searchQuery.trim()) {
      analyticsTimeoutRef.current = setTimeout(() => {
        trackEvent("event_search", {
          event_category: "Events",
          query_length: searchQuery.length,
        });
      }, 500);
    }

    return () => {
      if (analyticsTimeoutRef.current) {
        clearTimeout(analyticsTimeoutRef.current);
      }
    };
  }, [searchQuery]);

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
      <main className="min-h-screen pt-16 pb-16 animated-bg">
        {/* Hero */}
        <section className="py-12 text-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 inline-block bg-gradient-to-r from-[#00F58D] to-[#A73EFF] bg-clip-text text-transparent">
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
                onChange={(e) => {
                  if (!isAuthenticated) {
                    setShowAuthModal(true);
                    return;
                  }
                  setSearchQuery(e.target.value);
                }}
                onFocus={() => {
                  if (!isAuthenticated) {
                    setShowAuthModal(true);
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <FilterTag
                isActive={!selectedType}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowAuthModal(true);
                    return;
                  }
                  setSelectedType(null);
                  trackEvent("event_filter_change", {
                    event_category: "Events",
                    filter_type: "event_type",
                    filter_value: "all",
                  });
                }}
              >
                All Events
              </FilterTag>
              {eventTypes.map((type) => (
                <FilterTag
                  key={type.value}
                  isActive={selectedType === type.value}
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowAuthModal(true);
                      return;
                    }
                    setSelectedType(type.value);
                    trackEvent("event_filter_change", {
                      event_category: "Events",
                      filter_type: "event_type",
                      filter_value: type.value,
                    });
                  }}
                >
                  {type.label}
                </FilterTag>
              ))}
            </div>
            <div className="ml-auto">
              <Button
                variant="primary"
                className="whitespace-nowrap"
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowAuthModal(true);
                    return;
                  }
                  if (!isVip && !isAdmin) {
                    setShowProModal(true);
                    return;
                  }
                  setIsCreateModalOpen(true);
                  trackEvent("event_create_modal_open", {
                    event_category: "Events",
                  });
                }}
              >
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
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

      {/* Модальное окно создания события */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="lg"
        ariaLabel="Create new event"
      >
        <ModalHeader>
          <ModalTitle>Create Event</ModalTitle>
          <ModalDescription>
            Fill out the form to create a new event in the Solana ecosystem
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          <CreateEventForm
            onSuccess={async (event) => {
              setIsCreateModalOpen(false);
              // Обновляем список событий
              async function refreshEvents() {
                try {
                  const filters: Parameters<typeof getEvents>[0] = {
                    upcoming: false,
                  };
                  if (selectedType) {
                    filters.event_type = selectedType as "official" | "community" | "private" | "meetup";
                  }
                  const fetchedEvents = await getEvents(filters);
                  setEvents(fetchedEvents);
                } catch (err) {
                  console.error("Error refreshing events:", err);
                }
              }
              await refreshEvents();
              
              // Используем slug напрямую из созданного события
              router.push(`/events/${event.slug}`);
            }}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </ModalContent>
      </Modal>

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="This feature is available only for logged-in users"
        description="Please sign up or log in to use this feature."
      />

      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description="Creating events is available only with PRO subscription. Upgrade to PRO to unlock this feature."
      />
    </>
  );
}

