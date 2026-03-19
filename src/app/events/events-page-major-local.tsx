"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { Calendar } from "lucide-react";
import {
  getEventsShowcase,
  type ShowcaseEvent,
  type EventsShowcaseResponse,
} from "@/lib/api/events-showcase";

function formatDateRange(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate);
  const startText = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (!endDate) {
    return startText;
  }

  const end = new Date(endDate);
  const endText = end.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return `${startText} - ${endText}`;
}

function formatLocation(city?: string | null, country?: string | null): string {
  if (city && country) return `${city}`;
  if (city) return city;
  if (country) return country;
  return "Online";
}

function EventPoster({
  event,
  sizeClassName,
  onClick,
}: {
  event: ShowcaseEvent;
  sizeClassName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden bg-[#101319] border border-white/10 ${sizeClassName}`}
      aria-label={`Open ${event.name}`}
    >
      {event.image_url ? (
        <Image
          src={event.image_url}
          alt={event.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 45vw, 280px"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/45">
          <Calendar className="h-10 w-10" />
        </div>
      )}
    </button>
  );
}

function AttendeesSummary({
  attendees,
  peopleGoing,
  centered = false,
}: {
  attendees: ShowcaseEvent["attendee_previews"];
  peopleGoing: number;
  centered?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 ${centered ? "items-center" : "items-start"}`}>
      <div className={`flex items-center ${centered ? "justify-center" : "pl-2"}`}>
        {attendees.length > 0 ? (
          attendees.slice(0, 3).map((attendee, index) => (
            <Avatar
              key={attendee.id}
              src={attendee.avatar_url}
              alt={attendee.name}
              size="xs"
              className={index > 0 ? "-ml-2 border-2 border-black" : "border-2 border-black"}
            />
          ))
        ) : (
          <span className="h-6 w-6 rounded-full border border-white/20 bg-white/10" />
        )}
      </div>
      <p
        className={`text-[11px] text-white tracking-tight ${centered ? "text-center" : ""}`}
        style={{ fontFamily: "var(--font-kode-mono), monospace" }}
      >
        {peopleGoing} people going!
      </p>
    </div>
  );
}

function MajorEventCard({ event }: { event: ShowcaseEvent }) {
  const router = useRouter();

  return (
    <article className="flex flex-col items-start gap-3">
      <EventPoster
        event={event}
        sizeClassName="h-[200px] w-[200px] sm:h-[240px] sm:w-[240px] lg:h-[280px] lg:w-[280px]"
        onClick={() => router.push(`/events/${event.slug}`)}
      />

      <div className="space-y-2">
        <h3
          className="text-lg leading-tight text-white sm:text-xl"
          style={{ fontFamily: "var(--font-kode-mono), monospace" }}
        >
          {event.name}
        </h3>
        <p className="text-sm text-white/95" style={{ fontFamily: "var(--font-kode-mono), monospace" }}>
          {formatLocation(event.city, event.country)}
        </p>
        <p className="text-xs text-[#70767d]" style={{ fontFamily: "var(--font-kode-mono), monospace" }}>
          {formatDateRange(event.start_date, event.end_date)}
        </p>
      </div>

      <AttendeesSummary attendees={event.attendee_previews} peopleGoing={event.people_going} centered />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-[92px] border-white bg-white text-black hover:bg-white/90"
          onClick={() => router.push(`/events/${event.slug}`)}
        >
          Attend
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-[118px] border-[#00d084] bg-black text-white hover:bg-[#0f1411]"
          onClick={() => router.push(`/events/${event.slug}`)}
        >
          Show list
        </Button>
      </div>
    </article>
  );
}

function LocalEventRow({ event }: { event: ShowcaseEvent }) {
  const router = useRouter();

  return (
    <article className="grid grid-cols-1 items-start gap-4 border-b border-white/10 pb-6 md:grid-cols-[220px_1fr_auto]">
      <EventPoster
        event={event}
        sizeClassName="h-[140px] w-[140px] sm:h-[160px] sm:w-[160px] md:h-[200px] md:w-[200px]"
        onClick={() => router.push(`/events/${event.slug}`)}
      />

      <div className="space-y-2 md:pt-1">
        <h3
          className="text-xl leading-tight text-white"
          style={{ fontFamily: "var(--font-kode-mono), monospace" }}
        >
          {event.name}
        </h3>
        <p className="text-sm text-white/95" style={{ fontFamily: "var(--font-kode-mono), monospace" }}>
          {formatLocation(event.city, event.country)}
        </p>
        <p className="text-xs text-[#70767d]" style={{ fontFamily: "var(--font-kode-mono), monospace" }}>
          {formatDateRange(event.start_date, event.end_date)}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:items-start">
        <AttendeesSummary attendees={event.attendee_previews} peopleGoing={event.people_going} />
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-[118px] border-white bg-white text-black hover:bg-white/90"
          onClick={() => router.push(`/events/${event.slug}`)}
        >
          Show list
        </Button>
      </div>
    </article>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/70">
      {label}
    </div>
  );
}

export default function EventsPageMajorLocal() {
  const [data, setData] = useState<EventsShowcaseResponse>({
    majorEvents: [],
    localEvents: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getEventsShowcase();
        setData(response);
      } catch (err) {
        console.error("Failed to load events showcase:", err);
        setError("Failed to load events.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const hasAnyEvents = useMemo(
    () => data.majorEvents.length > 0 || data.localEvents.length > 0,
    [data.majorEvents.length, data.localEvents.length]
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pt-20 pb-16 text-white">
        <section className="mx-auto w-full px-4 sm:px-8 lg:px-[238px]">
          {loading ? (
            <div className="space-y-8 pt-10">
              <div className="h-8 w-56 animate-pulse rounded bg-white/10" />
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-4">
                    <div className="h-[220px] animate-pulse rounded bg-white/10 sm:h-[260px]" />
                    <div className="h-6 w-44 animate-pulse rounded bg-white/10" />
                    <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="pt-10">
              <EmptyState label={error} />
            </div>
          ) : (
            <div className="space-y-14 py-10">
              <section className="space-y-6">
                <h2
                  className="text-center text-[28px] font-semibold"
                  style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                >
                  Major events
                </h2>

                {data.majorEvents.length > 0 ? (
                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {data.majorEvents.map((event) => (
                      <MajorEventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <EmptyState label="No major events yet." />
                )}
              </section>

              <section className="space-y-6">
                <h2
                  className="text-center text-[28px] font-semibold"
                  style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                >
                  Local events
                </h2>

                {data.localEvents.length > 0 ? (
                  <div className="space-y-8">
                    {data.localEvents.map((event) => (
                      <LocalEventRow key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <EmptyState label="No local upcoming events." />
                )}
              </section>
            </div>
          )}

          {!loading && hasAnyEvents && (
            <div className="py-12 text-center">
              <p
                className="text-3xl leading-tight text-white"
                style={{ fontFamily: "var(--font-kode-mono), monospace" }}
              >
                Can&apos;t find your event?
              </p>
              <p
                className="mt-1 text-3xl leading-tight text-white"
                style={{ fontFamily: "var(--font-kode-mono), monospace" }}
              >
                Let us know - we&apos;ll add it.
              </p>
              <Link
                href="/about"
                className="mt-5 inline-flex text-sm text-white/70 underline underline-offset-4 hover:text-white"
                style={{ fontFamily: "var(--font-kode-mono), monospace" }}
              >
                Contact support
              </Link>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
