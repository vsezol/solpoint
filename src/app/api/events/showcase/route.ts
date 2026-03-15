import { createClient } from "@/lib/supabase/server";
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
  luma_event_id: string | null;
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

type ExternalLumaUser = {
  id: string;
  name: string | null;
  avatar: string | null;
};

type ExternalMemberRow = {
  event_id: string;
  user: ExternalLumaUser | ExternalLumaUser[] | null;
};

type AttendeePreview = {
  id: string;
  avatar_url: string;
  name: string;
  twitter_handle: string | null;
  source: "internal" | "external";
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
};

function isMissingIsMajorError(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  return error.message.toLowerCase().includes("is_major");
}

async function fetchEventsWithFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: {
    isVip: boolean;
    upcomingOnly: boolean;
  }
): Promise<{
  events: EventRow[];
  hasIsMajorColumn: boolean;
  error: { message?: string } | null;
}> {
  const buildQuery = (includeMajor: boolean) => {
    const selectColumns = includeMajor
      ? "id, name, slug, image_url, city, country, start_date, end_date, attendees_count, visibility, is_major, luma_event_id"
      : "id, name, slug, image_url, city, country, start_date, end_date, attendees_count, visibility, luma_event_id";

    let query = supabase
      .from("events")
      .select(selectColumns)
      .order("start_date", { ascending: true });

    if (options.upcomingOnly) {
      query = query.gte("start_date", new Date().toISOString());
    }

    if (!options.isVip) {
      query = query.eq("visibility", "public");
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

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let isVip = false;
  if (authUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", authUser.id)
      .single();
    isVip = profile?.subscription_tier === "vip";
  }

  const upcomingResult = await fetchEventsWithFallback(supabase, {
    isVip,
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
  let localEvents = upcomingEvents.filter((event) => event.is_major !== true);

  // Fallback: if there are no upcoming local events, show non-major events regardless of date.
  if (localEvents.length === 0) {
    const allEventsResult = await fetchEventsWithFallback(supabase, {
      isVip,
      upcomingOnly: false,
    });

    if (!allEventsResult.error) {
      localEvents = allEventsResult.events.filter((event) => event.is_major !== true);
    }
  }

  const displayedEvents = [...majorEvents, ...localEvents];

  const previewMap = new Map<string, AttendeePreview[]>();
  const displayedEventIds = displayedEvents.map((event) => event.id);

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
        const profile = toSingle(row.user);
        if (!profile?.avatar_url) continue;

        const current = previewMap.get(row.event_id) || [];
        if (current.some((item) => item.id === profile.id || item.avatar_url === profile.avatar_url)) {
          continue;
        }

        if (current.length < 3) {
          current.push({
            id: profile.id,
            avatar_url: profile.avatar_url,
            name: profile.twitter_name || profile.twitter_handle || "User",
            twitter_handle: profile.twitter_handle,
            source: "internal",
          });
          previewMap.set(row.event_id, current);
        }
      }
    }

    const lumaEventIds = displayedEvents
      .map((event) => event.luma_event_id)
      .filter((id): id is string => Boolean(id));

    if (lumaEventIds.length > 0) {
      const { data: externalRowsRaw, error: externalError } = await supabase
        .from("luma_event_attendees")
        .select("event_id, user:luma_users!luma_event_attendees_user_id_fkey(id, name, avatar)")
        .in("event_id", lumaEventIds)
        .order("scraped_at", { ascending: false });

      if (externalError) {
        console.error("Error fetching external attendee previews:", externalError);
      } else {
        const externalByLumaEventId = new Map<string, AttendeePreview[]>();

        for (const row of (externalRowsRaw || []) as ExternalMemberRow[]) {
          const externalUser = toSingle(row.user);
          if (!externalUser?.avatar) continue;

          const key = row.event_id;
          const current = externalByLumaEventId.get(key) || [];
          const externalPreviewId = `luma:${externalUser.id}`;
          if (current.some((item) => item.id === externalPreviewId || item.avatar_url === externalUser.avatar)) {
            continue;
          }

          if (current.length < 3) {
            current.push({
              id: externalPreviewId,
              avatar_url: externalUser.avatar,
              name: externalUser.name || "Guest",
              twitter_handle: null,
              source: "external",
            });
            externalByLumaEventId.set(key, current);
          }
        }

        for (const event of displayedEvents) {
          if (!event.luma_event_id) continue;

          const internal = previewMap.get(event.id) || [];
          if (internal.length >= 3) continue;

          const external = externalByLumaEventId.get(event.luma_event_id) || [];
          for (const attendee of external) {
            if (internal.length >= 3) break;
            if (internal.some((item) => item.id === attendee.id || item.avatar_url === attendee.avatar_url)) {
              continue;
            }
            internal.push(attendee);
          }
          previewMap.set(event.id, internal);
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
    people_going: event.attendees_count || 0,
    attendee_previews: previewMap.get(event.id) || [],
    is_major: event.is_major === true,
  });

  return NextResponse.json(
    {
      majorEvents: majorEvents.map(mapShowcaseEvent),
      localEvents: localEvents.map(mapShowcaseEvent),
      hasIsMajorColumn: upcomingResult.hasIsMajorColumn,
    },
    { status: 200 }
  );
}
