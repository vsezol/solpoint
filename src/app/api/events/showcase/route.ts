import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type EventRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  city: string | null;
  country: string | null;
  start_date: string;
  end_date: string | null;
  attendees_count: number | null;
  visibility: "public" | "vip_only";
  is_major: boolean | null;
};

type InternalProfile = {
  id: string;
  twitter_handle: string | null;
  twitter_name: string | null;
  avatar_url: string | null;
};

type InternalMemberRow = {
  event_id: string;
  user: InternalProfile | InternalProfile[] | null;
};

type AttendeePreview = {
  id: string;
  avatar_url: string | null;
  name: string;
  twitter_handle: string | null;
  source: "internal";
};

type ShowcaseEvent = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  city: string | null;
  country: string | null;
  start_date: string;
  end_date: string | null;
  people_going: number;
  attendee_previews: AttendeePreview[];
  is_major: boolean;
  is_attending: boolean;
};

const DEFAULT_LOCAL_PAGE_SIZE = 8;
const MAX_LOCAL_PAGE_SIZE = 50;

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function isMissingIsMajorError(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  return error.message.toLowerCase().includes("is_major");
}

async function fetchEventsWithFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: {
    upcomingOnly: boolean;
  }
): Promise<{
  events: EventRow[];
  hasIsMajorColumn: boolean;
  error: { message?: string } | null;
}> {
  const buildQuery = (includeMajor: boolean) => {
    if (includeMajor) {
      let query = supabase
        .from("events")
        .select(
          "id, name, slug, image_url, city, country, start_date, end_date, attendees_count, visibility, is_major"
        )
        .order("start_date", { ascending: true });
      if (options.upcomingOnly) {
        query = query.gte("start_date", new Date().toISOString());
      }
      return query;
    }

    let query = supabase
      .from("events")
      .select(
        "id, name, slug, image_url, city, country, start_date, end_date, attendees_count, visibility"
      )
      .order("start_date", { ascending: true });
    if (options.upcomingOnly) {
      query = query.gte("start_date", new Date().toISOString());
    }
    return query;
  };

  const withMajor = await buildQuery(true);
  if (!withMajor.error) {
    return {
      events: (withMajor.data || []) as EventRow[],
      hasIsMajorColumn: true,
      error: null,
    };
  }

  if (!isMissingIsMajorError(withMajor.error)) {
    return {
      events: [],
      hasIsMajorColumn: true,
      error: withMajor.error,
    };
  }

  const withoutMajor = await buildQuery(false);
  if (withoutMajor.error) {
    return {
      events: [],
      hasIsMajorColumn: false,
      error: withoutMajor.error,
    };
  }

  const normalized = ((withoutMajor.data || []) as Omit<EventRow, "is_major">[]).map(
    (event) => ({
      ...event,
      is_major: false,
    })
  );

  return {
    events: normalized,
    hasIsMajorColumn: false,
    error: null,
  };
}

function toSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedLocalPage = parsePositiveInt(searchParams.get("local_page"), 1);
  const requestedLocalPageSize = parsePositiveInt(
    searchParams.get("local_page_size"),
    DEFAULT_LOCAL_PAGE_SIZE
  );
  const localPageSize = Math.min(requestedLocalPageSize, MAX_LOCAL_PAGE_SIZE);

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const upcomingResult = await fetchEventsWithFallback(supabase, {
    upcomingOnly: true,
  });
  const eventsError = upcomingResult.error;

  if (eventsError) {
    console.error("Error fetching showcase events:", eventsError);
    return NextResponse.json(
      { error: eventsError.message || "Failed to fetch showcase events" },
      { status: 500 }
    );
  }

  const upcomingEvents = upcomingResult.events;
  const majorEvents = upcomingEvents.filter((event) => event.is_major === true).slice(0, 3);
  let allLocalEvents = upcomingEvents.filter((event) => event.is_major !== true);

  // Fallback: if there are no upcoming local events, show non-major events regardless of date.
  if (allLocalEvents.length === 0) {
    const allEventsResult = await fetchEventsWithFallback(supabase, {
      upcomingOnly: false,
    });

    if (!allEventsResult.error) {
      allLocalEvents = allEventsResult.events.filter((event) => event.is_major !== true);
    }
  }

  const localTotal = allLocalEvents.length;
  const localTotalPages = localTotal === 0 ? 0 : Math.ceil(localTotal / localPageSize);
  const localPage = localTotalPages === 0 ? 1 : Math.min(requestedLocalPage, localTotalPages);
  const localOffset = (localPage - 1) * localPageSize;
  const pagedLocalEvents = allLocalEvents.slice(localOffset, localOffset + localPageSize);

  const displayedEvents = [...majorEvents, ...pagedLocalEvents];

  const previewMap = new Map<string, AttendeePreview[]>();
  const peopleGoingMap = new Map<string, number>();
  const displayedEventIds = displayedEvents.map((event) => event.id);
  const attendingEventIds = new Set<string>();

  if (authUser && displayedEventIds.length > 0) {
    const { data: selfAttendanceRows, error: selfAttendanceError } = await supabase
      .from("event_members")
      .select("event_id")
      .in("event_id", displayedEventIds)
      .eq("user_id", authUser.id)
      .eq("status", "going");

    if (selfAttendanceError) {
      console.error("Error fetching current user attendance in showcase:", selfAttendanceError);
    } else {
      for (const row of selfAttendanceRows || []) {
        if (row.event_id) {
          attendingEventIds.add(row.event_id);
        }
      }
    }
  }

  if (displayedEventIds.length > 0) {
    const { data: internalRowsRaw, error: internalError } = await supabase
      .from("event_members")
      .select(
        "event_id, user:profiles!event_members_user_id_fkey(id, twitter_handle, twitter_name, avatar_url)"
      )
      .in("event_id", displayedEventIds)
      .eq("status", "going")
      .order("registered_at", { ascending: false });

    if (internalError) {
      console.error("Error fetching internal attendee previews:", internalError);
    } else {
      for (const row of (internalRowsRaw || []) as InternalMemberRow[]) {
        peopleGoingMap.set(row.event_id, (peopleGoingMap.get(row.event_id) || 0) + 1);

        const profile = toSingle(row.user);
        if (!profile) continue;

        const current = previewMap.get(row.event_id) || [];
        if (current.some((item) => item.id === profile.id)) {
          continue;
        }

        if (current.length < 3) {
          current.push({
            id: profile.id,
            avatar_url: profile.avatar_url || null,
            name: profile.twitter_name || profile.twitter_handle || "User",
            twitter_handle: profile.twitter_handle,
            source: "internal",
          });
          previewMap.set(row.event_id, current);
        }
      }
    }
  }

  const mapShowcaseEvent = (event: EventRow): ShowcaseEvent => ({
    id: event.id,
    name: event.name,
    slug: event.slug,
    image_url: event.image_url,
    city: event.city,
    country: event.country,
    start_date: event.start_date,
    end_date: event.end_date,
    people_going: peopleGoingMap.get(event.id) || 0,
    attendee_previews: previewMap.get(event.id) || [],
    is_major: event.is_major === true,
    is_attending: attendingEventIds.has(event.id),
  });

  return NextResponse.json(
    {
      majorEvents: majorEvents.map(mapShowcaseEvent),
      localEvents: pagedLocalEvents.map(mapShowcaseEvent),
      localPagination: {
        page: localPage,
        page_size: localPageSize,
        total: localTotal,
        total_pages: localTotalPages,
      },
      hasIsMajorColumn: upcomingResult.hasIsMajorColumn,
    },
    { status: 200 }
  );
}
