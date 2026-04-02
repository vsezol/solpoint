export interface ShowcaseAttendeePreview {
  id: string;
  avatar_url: string | null;
  name: string;
  twitter_handle: string | null;
  source: "internal";
}

export interface ShowcaseEvent {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  city: string | null;
  country: string | null;
  start_date: string;
  end_date: string | null;
  people_going: number;
  attendee_previews: ShowcaseAttendeePreview[];
  is_major: boolean;
  is_attending: boolean;
}

export interface ShowcaseLocalPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface EventsShowcaseResponse {
  majorEvents: ShowcaseEvent[];
  localEvents: ShowcaseEvent[];
  localPagination: ShowcaseLocalPagination;
}

interface GetEventsShowcaseOptions {
  localPage?: number;
  localPageSize?: number;
}

const DEFAULT_LOCAL_PAGINATION: ShowcaseLocalPagination = {
  page: 1,
  page_size: 8,
  total: 0,
  total_pages: 0,
};

function toPositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.floor(value);
}

export async function getEventsShowcase(
  options: GetEventsShowcaseOptions = {}
): Promise<EventsShowcaseResponse> {
  try {
    const params = new URLSearchParams();
    if (typeof options.localPage === "number") {
      params.set("local_page", String(options.localPage));
    }
    if (typeof options.localPageSize === "number") {
      params.set("local_page_size", String(options.localPageSize));
    }

    const endpoint = params.toString()
      ? `/api/events/showcase?${params.toString()}`
      : "/api/events/showcase";
    const response = await fetch(endpoint, { cache: "no-store" });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching events showcase:", errorData);
      return {
        majorEvents: [],
        localEvents: [],
        localPagination: DEFAULT_LOCAL_PAGINATION,
      };
    }

    const data = (await response.json()) as Partial<
      EventsShowcaseResponse & { localPagination?: Partial<ShowcaseLocalPagination> }
    >;

    const localPagination: Partial<ShowcaseLocalPagination> = data.localPagination ?? {};
    return {
      majorEvents: Array.isArray(data.majorEvents) ? data.majorEvents : [],
      localEvents: Array.isArray(data.localEvents) ? data.localEvents : [],
      localPagination: {
        page: toPositiveInt(localPagination.page, DEFAULT_LOCAL_PAGINATION.page),
        page_size: toPositiveInt(localPagination.page_size, DEFAULT_LOCAL_PAGINATION.page_size),
        total:
          typeof localPagination.total === "number" && Number.isFinite(localPagination.total)
            ? Math.max(0, Math.floor(localPagination.total))
            : DEFAULT_LOCAL_PAGINATION.total,
        total_pages:
          typeof localPagination.total_pages === "number" &&
          Number.isFinite(localPagination.total_pages)
            ? Math.max(0, Math.floor(localPagination.total_pages))
            : DEFAULT_LOCAL_PAGINATION.total_pages,
      },
    };
  } catch (error) {
    console.error("Error fetching events showcase:", error);
    return {
      majorEvents: [],
      localEvents: [],
      localPagination: DEFAULT_LOCAL_PAGINATION,
    };
  }
}
