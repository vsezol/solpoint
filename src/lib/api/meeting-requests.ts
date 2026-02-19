import type {
  MeetingRequest,
  MeetingRequestCounts,
} from "@/types";

interface MeetingRequestsResponse {
  data: MeetingRequest[];
  count: number;
}

interface CreateMeetingRequestPayload {
  event_id: string;
  responder_id: string;
  start_at: string;
  end_at: string;
  timezone: string;
  message?: string;
  place?: string;
}

interface RescheduleMeetingRequestPayload {
  start_at: string;
  end_at: string;
  timezone: string;
  message?: string;
  place?: string;
}

async function parseJsonOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

export async function createMeetingRequest(payload: CreateMeetingRequestPayload): Promise<MeetingRequest> {
  const response = await fetch("/api/meeting-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await parseJsonOrThrow(response);
  return result.data as MeetingRequest;
}

export async function getMeetingRequests(params?: {
  scope?: "inbox" | "outbox" | "all";
  status?: "pending" | "approved" | "rejected";
  event_id?: string;
}): Promise<MeetingRequestsResponse> {
  const query = new URLSearchParams();
  if (params?.scope) query.set("scope", params.scope);
  if (params?.status) query.set("status", params.status);
  if (params?.event_id) query.set("event_id", params.event_id);

  const response = await fetch(`/api/meeting-requests${query.toString() ? `?${query.toString()}` : ""}`, {
    cache: "no-store",
  });

  return (await parseJsonOrThrow(response)) as MeetingRequestsResponse;
}

export async function approveMeetingRequest(id: string): Promise<MeetingRequest> {
  const response = await fetch(`/api/meeting-requests/${id}/approve`, {
    method: "POST",
  });

  const result = await parseJsonOrThrow(response);
  return result.data as MeetingRequest;
}

export async function rejectMeetingRequest(id: string): Promise<MeetingRequest> {
  const response = await fetch(`/api/meeting-requests/${id}/reject`, {
    method: "POST",
  });

  const result = await parseJsonOrThrow(response);
  return result.data as MeetingRequest;
}

export async function rescheduleMeetingRequest(
  id: string,
  payload: RescheduleMeetingRequestPayload
): Promise<MeetingRequest> {
  const response = await fetch(`/api/meeting-requests/${id}/reschedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await parseJsonOrThrow(response);
  return result.data as MeetingRequest;
}

export async function getMeetingRequestCounts(): Promise<MeetingRequestCounts> {
  const response = await fetch("/api/meeting-requests/counts", { cache: "no-store" });
  const result = await parseJsonOrThrow(response);
  return result.data as MeetingRequestCounts;
}

export async function markMeetingEventsRead(payload?: {
  request_ids?: string[];
  mark_all?: boolean;
}): Promise<void> {
  const response = await fetch("/api/meeting-requests/events/read", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || { mark_all: true }),
  });

  await parseJsonOrThrow(response);
}

export interface CanRequestMeetingResponse {
  canRequest: boolean;
  sharedEvents: CanRequestMeetingSharedEvent[];
}

export interface CanRequestMeetingSharedEvent {
  id: string;
  name: string;
  slug: string | null;
  eventStartAt: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  resolvedTimezone: string | null;
}

export async function getCanRequestMeeting(profileUserId: string): Promise<CanRequestMeetingResponse> {
  const response = await fetch(`/api/meeting-requests/can-request?userId=${encodeURIComponent(profileUserId)}`, {
    cache: "no-store",
  });
  const data = await parseJsonOrThrow(response);

  const sharedEvents: CanRequestMeetingSharedEvent[] = Array.isArray(data.sharedEvents)
    ? data.sharedEvents.map((event: unknown) => {
        const item = event as Partial<CanRequestMeetingSharedEvent>;
        return {
          id: String(item.id || ""),
          name: String(item.name || ""),
          slug: typeof item.slug === "string" ? item.slug : null,
          eventStartAt: typeof item.eventStartAt === "string" ? item.eventStartAt : null,
          timezone: typeof item.timezone === "string" ? item.timezone : null,
          latitude: typeof item.latitude === "number" ? item.latitude : null,
          longitude: typeof item.longitude === "number" ? item.longitude : null,
          resolvedTimezone: typeof item.resolvedTimezone === "string" ? item.resolvedTimezone : null,
        };
      })
    : [];

  return {
    canRequest: Boolean(data.canRequest),
    sharedEvents,
  };
}
