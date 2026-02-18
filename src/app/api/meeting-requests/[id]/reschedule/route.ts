import { NextRequest, NextResponse } from "next/server";
import {
  ensureVipUser,
  getAuthContext,
  getCounterpartyId,
  getMeetingRequestForUser,
  meetingRequestsErrorResponse,
  serializeMeetingRequests,
} from "../../helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if ("response" in auth) return auth.response;

    const { supabase, authUser } = auth;
    const vipCheck = await ensureVipUser(supabase, authUser.id);
    if (vipCheck) return vipCheck;
    const { id } = await params;

    const body = await request.json();
    const { start_at, end_at, timezone, message } = body;

    if (!start_at || !end_at || !timezone) {
      return NextResponse.json({ error: "start_at, end_at and timezone are required" }, { status: 400 });
    }

    const startDate = new Date(start_at);
    const endDate = new Date(end_at);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid datetime values" }, { status: 400 });
    }

    if (endDate <= startDate) {
      return NextResponse.json({ error: "end_at must be after start_at" }, { status: 400 });
    }

    const meetingRequest = await getMeetingRequestForUser(supabase, id, authUser.id);

    if (!meetingRequest) {
      return NextResponse.json({ error: "Meeting request not found" }, { status: 404 });
    }

    if (meetingRequest.status !== "pending") {
      return NextResponse.json({ error: "Only pending requests can be rescheduled" }, { status: 400 });
    }

    if (meetingRequest.awaiting_user_id !== authUser.id) {
      return NextResponse.json({ error: "Only the awaiting user can reschedule this request" }, { status: 403 });
    }

    const counterpartyId = getCounterpartyId(meetingRequest, authUser.id);

    const { data: proposal, error: proposalError } = await supabase
      .from("meeting_request_proposals")
      .insert({
        meeting_request_id: id,
        proposed_by_user_id: authUser.id,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        timezone,
        message: message?.trim() || null,
      })
      .select("id")
      .single();

    if (proposalError) throw proposalError;

    const { error: updateError } = await supabase
      .from("meeting_requests")
      .update({
        status: "pending",
        current_proposal_id: proposal.id,
        awaiting_user_id: counterpartyId,
        last_action_by: authUser.id,
      })
      .eq("id", id)
      .eq("status", "pending");

    if (updateError) throw updateError;

    const { error: eventError } = await supabase
      .from("meeting_request_events")
      .insert({
        meeting_request_id: id,
        actor_id: authUser.id,
        target_user_id: counterpartyId,
        event_type: "rescheduled",
        proposal_id: proposal.id,
      });

    if (eventError) throw eventError;

    const { data: updatedRequest, error: fetchError } = await supabase
      .from("meeting_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const serialized = await serializeMeetingRequests(supabase, [updatedRequest], authUser.id);

    return NextResponse.json({ data: serialized[0] });
  } catch (error: any) {
    console.error("Reschedule meeting request error:", error);
    return meetingRequestsErrorResponse(error, "Failed to reschedule meeting request");
  }
}
