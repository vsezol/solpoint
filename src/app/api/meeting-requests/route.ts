import { NextRequest, NextResponse } from "next/server";
import {
  ensureEventMembersGoing,
  ensureVipUser,
  getAuthContext,
  meetingRequestsErrorResponse,
  serializeMeetingRequests,
} from "./helpers";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if ("response" in auth) return auth.response;

    const { supabase, authUser } = auth;

    const vipCheck = await ensureVipUser(supabase, authUser.id);
    if (vipCheck) return vipCheck;

    const body = await request.json();
    const { event_id, responder_id, start_at, end_at, timezone, message, place } = body;

    if (!event_id || !responder_id || !start_at || !end_at || !timezone) {
      return NextResponse.json({ error: "event_id, responder_id, start_at, end_at, timezone are required" }, { status: 400 });
    }

    if (responder_id === authUser.id) {
      return NextResponse.json({ error: "Cannot create a meeting request with yourself" }, { status: 400 });
    }

    const startDate = new Date(start_at);
    const endDate = new Date(end_at);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid datetime values" }, { status: 400 });
    }

    if (endDate <= startDate) {
      return NextResponse.json({ error: "end_at must be after start_at" }, { status: 400 });
    }

    const attendeesCheck = await ensureEventMembersGoing(supabase, event_id, [authUser.id, responder_id]);
    if (!attendeesCheck.ok) {
      return NextResponse.json({ error: attendeesCheck.error }, { status: 400 });
    }

    const { data: existingPending } = await supabase
      .from("meeting_requests")
      .select("id")
      .eq("event_id", event_id)
      .eq("status", "pending")
      .or(`and(requester_id.eq.${authUser.id},responder_id.eq.${responder_id}),and(requester_id.eq.${responder_id},responder_id.eq.${authUser.id})`)
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json({ error: "An active meeting request already exists for this pair and event" }, { status: 409 });
    }

    const { data: insertedRequest, error: insertRequestError } = await supabase
      .from("meeting_requests")
      .insert({
        event_id,
        requester_id: authUser.id,
        responder_id,
        status: "pending",
        awaiting_user_id: responder_id,
        last_action_by: authUser.id,
      })
      .select("*")
      .single();

    if (insertRequestError) {
      if (insertRequestError.code === "23505") {
        return NextResponse.json({ error: "An active meeting request already exists for this pair and event" }, { status: 409 });
      }
      throw insertRequestError;
    }

    const { data: proposal, error: proposalError } = await supabase
      .from("meeting_request_proposals")
      .insert({
        meeting_request_id: insertedRequest.id,
        proposed_by_user_id: authUser.id,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        timezone,
        message: message?.trim() || null,
        place: place?.trim() || null,
      })
      .select("id")
      .single();

    if (proposalError) throw proposalError;

    const { error: updateError } = await supabase
      .from("meeting_requests")
      .update({
        current_proposal_id: proposal.id,
        last_action_by: authUser.id,
      })
      .eq("id", insertedRequest.id);

    if (updateError) throw updateError;

    const { error: eventError } = await supabase
      .from("meeting_request_events")
      .insert({
        meeting_request_id: insertedRequest.id,
        actor_id: authUser.id,
        target_user_id: responder_id,
        event_type: "created",
        proposal_id: proposal.id,
      });

    if (eventError) throw eventError;

    const { data: finalRequest, error: finalRequestError } = await supabase
      .from("meeting_requests")
      .select("*")
      .eq("id", insertedRequest.id)
      .single();

    if (finalRequestError) throw finalRequestError;

    const serialized = await serializeMeetingRequests(supabase, [finalRequest], authUser.id);

    return NextResponse.json({ data: serialized[0] });
  } catch (error: any) {
    console.error("Create meeting request error:", error);
    return meetingRequestsErrorResponse(error, "Failed to create meeting request");
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if ("response" in auth) return auth.response;

    const { supabase, authUser } = auth;
    const vipCheck = await ensureVipUser(supabase, authUser.id);
    if (vipCheck) return vipCheck;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "all";
    const status = searchParams.get("status");
    const eventId = searchParams.get("event_id");

    let query = supabase
      .from("meeting_requests")
      .select("*")
      .order("updated_at", { ascending: false });

    if (scope === "inbox") {
      query = query.eq("responder_id", authUser.id);
    } else if (scope === "outbox") {
      query = query.eq("requester_id", authUser.id);
    } else {
      query = query.or(`requester_id.eq.${authUser.id},responder_id.eq.${authUser.id}`);
    }

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query = query.eq("status", status);
    }

    if (eventId) {
      query = query.eq("event_id", eventId);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const serialized = await serializeMeetingRequests(supabase, (rows || []) as any[], authUser.id);

    return NextResponse.json({
      data: serialized,
      count: serialized.length,
    });
  } catch (error: any) {
    console.error("Get meeting requests error:", error);
    return meetingRequestsErrorResponse(error, "Failed to get meeting requests");
  }
}
