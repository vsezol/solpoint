"use client";

import { Card, Button } from "@/components/ui";
import { Calendar, Plus, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { EntityType, Event } from "@/types";

interface EntityEventsListProps {
  entityId: string;
  entityType: EntityType;
}

export function EntityEventsList({
  entityId,
  entityType,
}: EntityEventsListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Используем безопасный endpoint дашборда, который проверяет права доступа на бэкенде
        const response = await fetch(`/api/dashboard/events/${entityType}/${entityId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }

        const data = await response.json();
        const filteredEvents = data.events || [];
        
        setEvents(filteredEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [entityId, entityType]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card variant="bordered">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Events
          </h3>
        </div>
        <Button variant="primary" size="sm" asChild>
          <Link href={`/events?create=true&${entityType}=${entityId}`}>
            <Plus className="w-4 h-4 mr-2" />
            Create event
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
          Loading events...
        </p>
      ) : events.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
          No events yet. Create your first event!
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-border)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-[var(--color-text-primary)] truncate">
                  {event.name}
                </h4>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {formatDate(event.start_date)}
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/events/${event.slug}`}>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

