import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMeetingRequestsEnabled } from "@/lib/meeting-requests";
import type { MeetingRequest, MeetingRequestProposal, User, Event } from "@/types";

export type MeetingRequestRow = {
  id: string;
  event_id: string;
  requester_id: string;
  responder_id: string;
  status: "pending" | "approved" | "rejected";
  current_proposal_id: string | null;
  awaiting_user_id: string;
  last_action_by: string;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
};

type ErrorLike = {
  code?: string;
  message?: string;
};

export function getMeetingRequestsErrorPayload(
  error: unknown,
  fallbackMessage: string
): { status: number; message: string } {
  const safeFallback = fallbackMessage || "Meeting requests are temporarily unavailable";
  const raw = (error || {}) as ErrorLike;
  const code = raw.code || "";
  const message = (raw.message || "").toLowerCase();

  if (
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  ) {
    return {
      status: 503,
      message: "Meeting requests are temporarily unavailable. Please try again later.",
    };
  }

  if (code === "42501") {
    return {
      status: 403,
      message: "You do not have access to this meeting request action.",
    };
  }

  if (code === "23505") {
    return {
      status: 409,
      message: "This meeting request already exists.",
    };
  }

  return {
    status: 500,
    message: safeFallback,
  };
}

export function meetingRequestsErrorResponse(error: unknown, fallbackMessage: string) {
  const payload = getMeetingRequestsErrorPayload(error, fallbackMessage);
  return NextResponse.json({ error: payload.message }, { status: payload.status });
}

export async function getAuthContext() {
  if (!isMeetingRequestsEnabled()) {
    return {
      response: NextResponse.json({ error: "Meeting requests are disabled" }, { status: 404 }),
    };
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { supabase, authUser };
}

export async function ensureVipUser(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  if (profile.subscription_tier !== "vip") {
    return NextResponse.json({ error: "PRO subscription required" }, { status: 403 });
  }

  return null;
}

export async function ensureEventMembersGoing(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userIds: string[]
) {
  const { data, error } = await supabase
    .from("event_members")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("status", "going")
    .in("user_id", userIds);

  if (error) {
    return { error: "Failed to validate event attendees", ok: false } as const;
  }

  const foundIds = new Set((data || []).map((row) => row.user_id));
  const allPresent = userIds.every((id) => foundIds.has(id));

  if (!allPresent) {
    return { error: "Both users must be internal attendees of this event", ok: false } as const;
  }

  return { ok: true } as const;
}

export async function getMeetingRequestForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestId: string,
  userId: string
): Promise<MeetingRequestRow | null> {
  const { data, error } = await supabase
    .from("meeting_requests")
    .select("*")
    .eq("id", requestId)
    .or(`requester_id.eq.${userId},responder_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as MeetingRequestRow | null;
}

export function getCounterpartyId(request: MeetingRequestRow, userId: string): string {
  return request.requester_id === userId ? request.responder_id : request.requester_id;
}

export async function serializeMeetingRequests(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: MeetingRequestRow[],
  currentUserId: string
): Promise<MeetingRequest[]> {
  if (rows.length === 0) {
    return [];
  }

  const proposalIds = rows
    .map((row) => row.current_proposal_id)
    .filter((id): id is string => Boolean(id));

  const eventIds = [...new Set(rows.map((row) => row.event_id))];
  const profileIds = [...new Set(rows.flatMap((row) => [row.requester_id, row.responder_id]))];
  const requestIds = rows.map((row) => row.id);

  const [proposalsResult, eventsResult, profilesResult, unreadEventsResult] = await Promise.all([
    proposalIds.length
      ? supabase
          .from("meeting_request_proposals")
          .select("id, meeting_request_id, proposed_by_user_id, start_at, end_at, timezone, message, created_at")
          .in("id", proposalIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("events")
      .select("id, name, slug, start_date, end_date, timezone, longitude")
      .in("id", eventIds),
    supabase
      .from("profiles")
      .select("id, twitter_handle, twitter_name, avatar_url, is_verified")
      .in("id", profileIds),
    supabase
      .from("meeting_request_events")
      .select("meeting_request_id")
      .eq("target_user_id", currentUserId)
      .eq("is_read", false)
      .in("meeting_request_id", requestIds),
  ]);

  if (proposalsResult.error) throw proposalsResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (unreadEventsResult.error) throw unreadEventsResult.error;

  const proposalMap = new Map<string, MeetingRequestProposal>(
    (proposalsResult.data || []).map((proposal) => [
      proposal.id,
      {
        id: proposal.id,
        meeting_request_id: proposal.meeting_request_id,
        proposed_by_user_id: proposal.proposed_by_user_id,
        start_at: proposal.start_at,
        end_at: proposal.end_at,
        timezone: proposal.timezone,
        message: proposal.message,
        created_at: proposal.created_at,
      } as MeetingRequestProposal,
    ])
  );

  const eventMap = new Map<string, Pick<Event, "id" | "name" | "slug" | "start_date" | "end_date" | "timezone" | "longitude">>(
    (eventsResult.data || []).map((event) => [
      event.id,
      {
        id: event.id,
        name: event.name,
        slug: event.slug,
        start_date: event.start_date,
        end_date: event.end_date,
        timezone: event.timezone,
        longitude: event.longitude,
      },
    ])
  );

  const profileMap = new Map<string, Pick<User, "id" | "twitter_handle" | "twitter_name" | "avatar_url" | "is_verified">>(
    (profilesResult.data || []).map((profile) => [
      profile.id,
      {
        id: profile.id,
        twitter_handle: profile.twitter_handle,
        twitter_name: profile.twitter_name,
        avatar_url: profile.avatar_url,
        is_verified: profile.is_verified,
      },
    ])
  );

  const unreadCountMap = new Map<string, number>();
  for (const event of unreadEventsResult.data || []) {
    unreadCountMap.set(event.meeting_request_id, (unreadCountMap.get(event.meeting_request_id) || 0) + 1);
  }

  return rows.map((row) => {
    const counterpartyId = getCounterpartyId(row, currentUserId);
    return {
      id: row.id,
      event_id: row.event_id,
      requester_id: row.requester_id,
      responder_id: row.responder_id,
      status: row.status,
      current_proposal_id: row.current_proposal_id,
      awaiting_user_id: row.awaiting_user_id,
      last_action_by: row.last_action_by,
      approved_at: row.approved_at,
      rejected_at: row.rejected_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      current_proposal: row.current_proposal_id ? proposalMap.get(row.current_proposal_id) || null : null,
      counterparty: profileMap.get(counterpartyId),
      event: eventMap.get(row.event_id),
      needs_action: row.awaiting_user_id === currentUserId && row.status === "pending",
      unread_events_count: unreadCountMap.get(row.id) || 0,
    } as MeetingRequest;
  });
}
