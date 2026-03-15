export interface ShowcaseAttendeePreview {
  id: string;
  avatar_url: string;
  name: string;
  twitter_handle: string | null;
  source: "internal" | "external";
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
}

export interface EventsShowcaseResponse {
  majorEvents: ShowcaseEvent[];
  localEvents: ShowcaseEvent[];
}

export async function getEventsShowcase(): Promise<EventsShowcaseResponse> {
  try {
    const response = await fetch("/api/events/showcase", { cache: "no-store" });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching events showcase:", errorData);
      return { majorEvents: [], localEvents: [] };
    }

    const data = (await response.json()) as Partial<EventsShowcaseResponse>;
    return {
      majorEvents: Array.isArray(data.majorEvents) ? data.majorEvents : [],
      localEvents: Array.isArray(data.localEvents) ? data.localEvents : [],
    };
  } catch (error) {
    console.error("Error fetching events showcase:", error);
    return { majorEvents: [], localEvents: [] };
  }
}
