"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import {
  AuthRequiredModal,
  Button,
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Calendar, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { EventsAttendeesWidget } from "@/components/events/events-attendees-widget";
import type { AttendeeFilterState, UserRole } from "@/types";
import { INTEREST_SLUGS, USER_ROLE_VALUES } from "@/lib/profile-taxonomy";
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

const ATTENDEES_PAGE_SIZE = 4;
const LOCAL_EVENTS_PAGE_SIZE = 8;

function parseBool(value: string | null): boolean {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const confirmModalClass = "!bg-[#101319] !border-white/[0.08] !rounded-[10px]";
const confirmModalHeaderClass = "!border-white/[0.08]";

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
    <div className={`flex flex-col gap-[11px] ${centered ? "items-center" : "items-start"}`}>
      <div className={`flex items-center ${centered ? "justify-center" : "pl-2"}`}>
        {attendees.length > 0 ? (
          attendees.slice(0, 3).map((attendee, index) => (
            <Avatar
              key={attendee.id}
              src={attendee.avatar_url}
              alt={attendee.name}
              size="sm"
              className={index > 0 ? "-ml-2.5" : ""}
            />
          ))
        ) : (
          <span className="h-8 w-8 rounded-full border border-white/20 bg-white/10" />
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

function MajorEventCard({
  event,
  onAttend,
  onShowList,
}: {
  event: ShowcaseEvent;
  onAttend: (event: ShowcaseEvent) => void;
  onShowList: (event: ShowcaseEvent) => void;
}) {
  const isAttending = event.is_attending;

  return (
    <article className="flex h-full min-w-0 flex-col">
      <EventPoster
        event={event}
        frame="hairline"
        className={cn(majorCardColumnClass, "aspect-square")}
        sizes="280px"
        onClick={() => onAttend(event)}
      />

      <div className={cn(majorCardColumnClass, "flex flex-1 flex-col gap-[48px] pt-[22px]")}>
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
              className={cn(
                "h-[49px] w-[125px] shrink-0 rounded-[7px] border px-0",
                isAttending
                  ? "cursor-default border-white/30 bg-[#1A1A1A] text-white/75! hover:bg-[#1A1A1A]"
                  : "border-white bg-white text-black! hover:bg-white/90"
              )}
              style={majorEventButtonTypography}
              onClick={() => {
                if (isAttending) return;
                onAttend(event);
              }}
              disabled={isAttending}
            >
              {isAttending ? "Attending" : "Attend"}
            </Button>
            <GradientBorderButton
              className="w-[125px] shrink-0"
              buttonStyle={majorEventButtonTypography}
              onClick={() => onShowList(event)}
            >
              Show list
            </GradientBorderButton>
          </div>
        </div>
      </div>
    </article>
  );
}

function LocalEventRow({
  event,
  onAttend,
  onShowList,
}: {
  event: ShowcaseEvent;
  onAttend: (event: ShowcaseEvent) => void;
  onShowList: (event: ShowcaseEvent) => void;
}) {
  const isAttending = event.is_attending;

  return (
    <article className="flex flex-row items-stretch gap-4 border-b border-white/10 pb-6">
      <EventPoster
        event={event}
        className="aspect-square w-[120px] shrink-0 sm:w-[160px] md:w-[200px]"
        sizes="(max-width: 640px) 120px, (max-width: 768px) 160px, 200px"
        onClick={() => onAttend(event)}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-[22px]">
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

      <div className="ml-[34px] flex shrink-0 flex-col items-center gap-[29px] pt-4 pb-[25px]">
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
            className={cn(
              "h-[49px] w-[125px] shrink-0 rounded-[7px] border px-0",
              isAttending
                ? "cursor-default border-white/30 bg-[#1A1A1A] text-white/75! hover:bg-[#1A1A1A]"
                : "border-white bg-white text-black! hover:bg-white/90"
            )}
            style={majorEventButtonTypography}
            onClick={() => {
              if (isAttending) return;
              onAttend(event);
            }}
            disabled={isAttending}
          >
            {isAttending ? "Attending" : "Attend"}
          </Button>
          <GradientBorderButton
            className="w-[125px] shrink-0"
            buttonStyle={majorEventButtonTypography}
            onClick={() => onShowList(event)}
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const attendeesSectionRef = useRef<HTMLDivElement | null>(null);

  const [data, setData] = useState<EventsShowcaseResponse>({
    majorEvents: [],
    localEvents: [],
    localPagination: {
      page: 1,
      page_size: LOCAL_EVENTS_PAGE_SIZE,
      total: 0,
      total_pages: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAttendEvent, setPendingAttendEvent] = useState<ShowcaseEvent | null>(null);
  const [isAttendSubmitting, setIsAttendSubmitting] = useState(false);
  const [attendError, setAttendError] = useState<string | null>(null);

  const localPage = useMemo(() => {
    const pageRaw = Number.parseInt(searchParams.get("local_page") || "1", 10);
    if (Number.isNaN(pageRaw) || pageRaw < 1) {
      return 1;
    }
    return pageRaw;
  }, [searchParams]);

  const loadShowcase = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await getEventsShowcase({
        localPage,
        localPageSize: LOCAL_EVENTS_PAGE_SIZE,
      });
      setData(response);
    } catch (err) {
      console.error("Failed to load events showcase:", err);
      setError("Failed to load events.");
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
    }
  }, [localPage]);

  useEffect(() => {
    loadShowcase();
  }, [loadShowcase]);

  const hasAnyEvents = useMemo(
    () => data.majorEvents.length > 0 || data.localEvents.length > 0,
    [data.majorEvents.length, data.localEvents.length]
  );

  const selectedEventId = searchParams.get("selected_event") || undefined;
  const attendeeFilters = useMemo<AttendeeFilterState>(() => {
    const roles = parseCsv(searchParams.get("roles")).filter((role) =>
      USER_ROLE_VALUES.includes(role as (typeof USER_ROLE_VALUES)[number])
    ) as UserRole[];

    const interestSlugs = parseCsv(searchParams.get("interest_slugs"))
      .map((slug) => slug.toLowerCase())
      .filter((slug) => INTEREST_SLUGS.has(slug));

    const pageRaw = Number.parseInt(searchParams.get("page") || "1", 10);
    const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

    return {
      selectedEventId,
      roles,
      countryCode: searchParams.get("country_code") || undefined,
      interestSlugs,
      bestMatches: parseBool(searchParams.get("best_matches")),
      completeProfiles: parseBool(searchParams.get("complete_profiles")),
      page,
      pageSize: ATTENDEES_PAGE_SIZE,
    };
  }, [searchParams, selectedEventId]);

  const currentPageUrl = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const updateEventsQuery = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const allEvents = useMemo(
    () => [...data.majorEvents, ...data.localEvents],
    [data.majorEvents, data.localEvents]
  );

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return undefined;
    return allEvents.find((event) => event.id === selectedEventId);
  }, [allEvents, selectedEventId]);

  const handleAttend = useCallback(
    (event: ShowcaseEvent) => {
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      setPendingAttendEvent(event);
      setAttendError(null);
    },
    [isAuthenticated]
  );

  const handleConfirmAttend = useCallback(async () => {
    if (!pendingAttendEvent || isAttendSubmitting) {
      return;
    }

    setIsAttendSubmitting(true);
    setAttendError(null);

    try {
      const response = await fetch(`/api/events/${pendingAttendEvent.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "going" }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (response.status === 401) {
        setPendingAttendEvent(null);
        setShowAuthModal(true);
        return;
      }

      if (!response.ok) {
        const message = payload.error || "Failed to register for event";
        if (message.toLowerCase().includes("already registered")) {
          setPendingAttendEvent(null);
          await loadShowcase(false);
          return;
        }
        setAttendError(message);
        return;
      }

      setPendingAttendEvent(null);
      await loadShowcase(false);
    } catch (attendRequestError) {
      setAttendError(
        attendRequestError instanceof Error
          ? attendRequestError.message
          : "Failed to register for event"
      );
    } finally {
      setIsAttendSubmitting(false);
    }
  }, [isAttendSubmitting, loadShowcase, pendingAttendEvent]);

  const handleRequireAuth = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const handleShowList = useCallback(
    (event: ShowcaseEvent) => {
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      updateEventsQuery({
        selected_event: event.id,
        page: "1",
      });
    },
    [isAuthenticated, updateEventsQuery]
  );

  const handleAttendeeFiltersChange = useCallback(
    (patch: Partial<AttendeeFilterState>, resetPage = true) => {
      if (!selectedEventId) return;

      const nextRoles = patch.roles ?? attendeeFilters.roles;
      // `undefined` means "all countries" in the widget; `??` would wrongly keep the previous code.
      const nextCountryCode =
        "countryCode" in patch ? patch.countryCode : attendeeFilters.countryCode;
      const nextInterestSlugs = patch.interestSlugs ?? attendeeFilters.interestSlugs;
      const nextBestMatches = patch.bestMatches ?? attendeeFilters.bestMatches;
      const nextCompleteProfiles = patch.completeProfiles ?? attendeeFilters.completeProfiles;
      const nextPage =
        patch.page ?? (resetPage ? 1 : attendeeFilters.page);

      updateEventsQuery({
        selected_event: selectedEventId,
        roles: nextRoles.length > 0 ? nextRoles.join(",") : null,
        country_code: nextCountryCode || null,
        interest_slugs: nextInterestSlugs.length > 0 ? nextInterestSlugs.join(",") : null,
        best_matches: nextBestMatches ? "1" : null,
        complete_profiles: nextCompleteProfiles ? "1" : null,
        page: String(nextPage),
      });
    },
    [attendeeFilters, selectedEventId, updateEventsQuery]
  );

  const handleCloseAttendees = useCallback(() => {
    updateEventsQuery({
      selected_event: null,
      roles: null,
      country_code: null,
      interest_slugs: null,
      best_matches: null,
      complete_profiles: null,
      page: null,
    });
  }, [updateEventsQuery]);

  const showAttendeesWidget = Boolean(selectedEvent && isAuthenticated);
  const canGoLocalPrev = data.localPagination.page > 1;
  const canGoLocalNext =
    data.localPagination.total_pages > 0 &&
    data.localPagination.page < data.localPagination.total_pages;

  const handleLocalPageChange = useCallback(
    (nextPage: number) => {
      if (nextPage < 1) return;
      updateEventsQuery({
        local_page: String(nextPage),
      });
    },
    [updateEventsQuery]
  );

  useEffect(() => {
    if (!showAttendeesWidget || !selectedEventId) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const section = attendeesSectionRef.current;
      if (!section) return;

      const top = section.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({
        top: Math.max(top, 0),
        behavior: "smooth",
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedEventId, showAttendeesWidget]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-16 pt-20 text-white">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-8 pt-10">
              <div className="h-8 w-56 animate-pulse rounded bg-white/10" />
              <div className="grid gap-[62px] sm:grid-cols-2 lg:grid-cols-3">
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
                  <div className="grid items-stretch gap-[62px] sm:grid-cols-2 lg:grid-cols-3">
                    {data.majorEvents.map((event) => (
                      <MajorEventCard
                        key={event.id}
                        event={event}
                        onAttend={handleAttend}
                        onShowList={handleShowList}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState label="No major events yet." />
                )}
              </section>

              <section className="space-y-0">
                {showAttendeesWidget && selectedEvent ? (
                  <div ref={attendeesSectionRef} className="mt-2">
                    <EventsAttendeesWidget
                      selectedEventId={selectedEvent.id}
                      selectedEventName={selectedEvent.name}
                      filters={attendeeFilters}
                      isAuthenticated={isAuthenticated}
                      onFiltersChange={handleAttendeeFiltersChange}
                      onRequireAuth={handleRequireAuth}
                      onClose={handleCloseAttendees}
                    />
                  </div>
                ) : (
                  <>
                    <h2
                      className="text-center text-[28px] font-semibold"
                      style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                    >
                      Local events
                    </h2>

                    {data.localEvents.length > 0 ? (
                      <div className="mt-10 sm:px-8 lg:px-16">
                        <div className="space-y-6">
                          {data.localEvents.map((event) => (
                            <LocalEventRow
                              key={event.id}
                              event={event}
                              onAttend={handleAttend}
                              onShowList={handleShowList}
                            />
                          ))}
                        </div>

                        {data.localPagination.total_pages > 1 ? (
                          <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-3 sm:flex-row">
                            <p
                              className="text-[12px] text-white/65"
                              style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                            >
                              {data.localPagination.total} local events
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 border-white/25 text-white hover:bg-white/10"
                                style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                                onClick={() =>
                                  handleLocalPageChange(Math.max(data.localPagination.page - 1, 1))
                                }
                                disabled={!canGoLocalPrev}
                              >
                                Prev
                              </Button>
                              <span
                                className="text-[12px] text-white/80"
                                style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                              >
                                Page {data.localPagination.page} of {data.localPagination.total_pages}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 border-white/25 text-white hover:bg-white/10"
                                style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                                onClick={() => handleLocalPageChange(data.localPagination.page + 1)}
                                disabled={!canGoLocalNext}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <EmptyState label="No local upcoming events." />
                    )}
                  </>
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
              <a
                href="#footer-contact"
                className="mt-5 inline-flex text-sm text-white/70 underline underline-offset-4 hover:text-white"
                style={{ fontFamily: "var(--font-kode-mono), monospace" }}
              >
                Contact support
              </a>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <Modal
        isOpen={Boolean(pendingAttendEvent)}
        onClose={() => {
          if (isAttendSubmitting) return;
          setPendingAttendEvent(null);
          setAttendError(null);
        }}
        size="md"
        className={confirmModalClass}
        closeButtonClassName="!text-white/40 hover:!text-white hover:!bg-white/10 !rounded-[5px]"
        ariaLabel="Confirm event attendance"
      >
        <ModalHeader className={confirmModalHeaderClass}>
          <ModalTitle
            className="text-[18px] font-semibold text-white"
            style={{ fontFamily: "var(--font-kode-mono), monospace" }}
          >
            Confirm attendance
          </ModalTitle>
          <ModalDescription style={{ fontFamily: "var(--font-kode-mono), monospace" }}>
            {pendingAttendEvent
              ? `Are you sure you are going to ${pendingAttendEvent.name}?`
              : "Are you sure you are going to this event?"}
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          {attendError ? (
            <p className="rounded border border-red-500/35 bg-red-500/10 px-3 py-2 text-[13px] text-red-200">
              {attendError}
            </p>
          ) : (
            <p className="text-[13px] text-white/70" style={{ fontFamily: "var(--font-kode-mono), monospace" }}>
              We will add you to the internal attendees list for this event.
            </p>
          )}
        </ModalContent>
        <ModalFooter className={confirmModalHeaderClass}>
          <Button
            variant="outline"
            className="h-[40px] rounded-[7px] border-white/35 bg-transparent text-white hover:bg-white/10"
            style={{ fontFamily: "var(--font-kode-mono), monospace" }}
            onClick={() => {
              if (isAttendSubmitting) return;
              setPendingAttendEvent(null);
              setAttendError(null);
            }}
            disabled={isAttendSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="h-[40px] rounded-[7px] border border-white bg-white text-black hover:bg-white/90"
            style={{ fontFamily: "var(--font-kode-mono), monospace" }}
            onClick={handleConfirmAttend}
            disabled={isAttendSubmitting}
          >
            {isAttendSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Accept
          </Button>
        </ModalFooter>
      </Modal>
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in required"
        description="Please sign up or log in to continue."
        redirectTo={currentPageUrl}
      />
    </>
  );
}
