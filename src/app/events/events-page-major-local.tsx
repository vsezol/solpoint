"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import {
  getEventsShowcase,
  type ShowcaseEvent,
  type EventsShowcaseResponse,
} from "@/lib/api/events-showcase";

const KM = "var(--font-kode-mono), monospace" as const;

/** Major events card — Figma typography */
const majorEventTitleStyle: React.CSSProperties = {
  fontFamily: KM,
  fontWeight: 600,
  fontSize: 25,
  lineHeight: "100%",
  letterSpacing: 0,
};

const majorEventMeta18Style: React.CSSProperties = {
  fontFamily: KM,
  fontWeight: 600,
  fontSize: 18,
  lineHeight: "100%",
  letterSpacing: "-0.05em",
};

const majorEventDateStyle: React.CSSProperties = {
  ...majorEventMeta18Style,
  color: "#70767D",
};

const majorEventButtonTypography: React.CSSProperties = {
  fontFamily: KM,
  fontWeight: 700,
  fontSize: 20,
  lineHeight: "100%",
  letterSpacing: "-0.05em",
};

/** Poster, title, meta, attendees, and buttons share one 280px-wide column (Figma). */
const majorCardColumnClass = "mx-auto w-full min-w-0 max-w-[280px]";

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
  className,
  sizes,
  onClick,
  /** `border` eats 2px from content (278×278 inside 280×280). `hairline` uses box-shadow so the image is full 280×280. */
  frame = "border",
}: {
  event: ShowcaseEvent;
  className?: string;
  sizes?: string;
  onClick: () => void;
  frame?: "border" | "hairline";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden bg-[#101319]",
        frame === "border" && "border border-white/10",
        frame === "hairline" && "shadow-[0_0_0_1px_rgba(255,255,255,0.1)]",
        className
      )}
      aria-label={`Open ${event.name}`}
    >
      {event.image_url ? (
        <Image
          src={event.image_url}
          alt={event.name}
          fill
          className="object-cover"
          sizes={sizes ?? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
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
  majorTypography = false,
}: {
  attendees: ShowcaseEvent["attendee_previews"];
  peopleGoing: number;
  centered?: boolean;
  /** Figma: Kode Mono 18px / 600 / line-height 100% / -5% tracking */
  majorTypography?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${centered ? "items-center" : "items-start"}`}>
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
        className={
          majorTypography
            ? `text-white ${centered ? "text-center" : ""}`
            : `text-[11px] text-white tracking-tight ${centered ? "text-center" : ""}`
        }
        style={majorTypography ? majorEventMeta18Style : { fontFamily: KM }}
      >
        {peopleGoing} people going!
      </p>
    </div>
  );
}

function MajorEventCard({ event }: { event: ShowcaseEvent }) {
  const router = useRouter();

  return (
    <article className="flex h-full min-w-0 flex-col">
      <EventPoster
        event={event}
        frame="hairline"
        className={cn(majorCardColumnClass, "aspect-square")}
        sizes="280px"
        onClick={() => router.push(`/events/${event.slug}`)}
      />

      <div className={cn(majorCardColumnClass, "flex flex-1 flex-col gap-3 pt-[22px]")}>
        <div className="min-w-0 space-y-[22px]">
          <h3 className="line-clamp-2 wrap-break-word text-white" style={majorEventTitleStyle}>
            {event.name}
          </h3>
          <p className="wrap-break-word text-white" style={majorEventMeta18Style}>
            {formatLocation(event.city, event.country)}
          </p>
          <p className="wrap-break-word" style={majorEventDateStyle}>
            {formatDateRange(event.start_date, event.end_date)}
          </p>
        </div>

        <div className="mt-auto flex flex-col items-center gap-[22px]">
          <AttendeesSummary
            attendees={event.attendee_previews}
            peopleGoing={event.people_going}
            centered
            majorTypography
          />

          <div className="flex w-full items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-[49px] w-[125px] shrink-0 rounded-[7px] border border-white bg-white px-0 text-black! hover:bg-white/90"
              style={majorEventButtonTypography}
              onClick={() => router.push(`/events/${event.slug}`)}
            >
              Attend
            </Button>
            <GradientBorderButton
              className="w-[125px] shrink-0"
              buttonStyle={majorEventButtonTypography}
              onClick={() => router.push(`/events/${event.slug}`)}
            >
              Show list
            </GradientBorderButton>
          </div>
        </div>
      </div>
    </article>
  );
}

function LocalEventRow({ event }: { event: ShowcaseEvent }) {
  const router = useRouter();

  return (
    <article className="grid grid-cols-[120px_1fr] items-start gap-4 border-b border-white/10 pb-6 sm:grid-cols-[160px_1fr_auto] md:grid-cols-[200px_1fr_auto]">
      <EventPoster
        event={event}
        className="aspect-square w-full"
        sizes="(max-width: 640px) 120px, (max-width: 768px) 160px, 200px"
        onClick={() => router.push(`/events/${event.slug}`)}
      />

      <div className="min-w-0 space-y-1.5">
        <h3
          className="text-base leading-tight text-white sm:text-lg md:text-xl"
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

      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-center sm:justify-start">
        <AttendeesSummary attendees={event.attendee_previews} peopleGoing={event.people_going} centered />
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-[49px] flex-1 rounded-[7px] border-white bg-white text-black hover:bg-white/90 sm:flex-none sm:w-[125px]"
            onClick={() => router.push(`/events/${event.slug}`)}
          >
            Attend
          </Button>
          <GradientBorderButton
            className="flex-1 sm:flex-none sm:w-[125px]"
            onClick={() => router.push(`/events/${event.slug}`)}
          >
            Show list
          </GradientBorderButton>
        </div>
      </div>
    </article>
  );
}

function GradientBorderButton({
  onClick,
  children,
  className,
  buttonStyle,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  buttonStyle?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-[7px] p-px ${className ?? ""}`}
      style={{ background: "linear-gradient(to right, #9849FC, #01F48B)" }}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-[49px] w-full rounded-[6px] bg-black text-white hover:bg-white/5"
        style={buttonStyle}
        onClick={onClick}
      >
        {children}
      </Button>
    </div>
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
      <main className="min-h-screen bg-black pb-16 pt-20 text-white">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-8 pt-10">
              <div className="h-8 w-56 animate-pulse rounded bg-white/10" />
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-4">
                    <div className="aspect-square w-full animate-pulse rounded bg-white/10" />
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
                  <div className="grid items-stretch gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {data.majorEvents.map((event) => (
                      <MajorEventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <EmptyState label="No major events yet." />
                )}
              </section>

              <section className="space-y-0">
                <h2
                  className="text-center text-[28px] font-semibold"
                  style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                >
                  Local events
                </h2>

                {data.localEvents.length > 0 ? (
                  <div className="mt-10 space-y-6 sm:px-8 lg:px-16">
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
        </div>
      </main>
      <Footer />
    </>
  );
}
