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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if ("response" in auth) return auth.response;

    const { supabase, authUser } = auth;
    const vipCheck = await ensureVipUser(supabase, authUser.id);
    if (vipCheck) return vipCheck;
    const { id } = await params;

    const meetingRequest = await getMeetingRequestForUser(supabase, id, authUser.id);

    if (!meetingRequest) {
      return NextResponse.json({ error: "Meeting request not found" }, { status: 404 });
    }

    if (meetingRequest.status !== "pending") {
      return NextResponse.json({ error: "Only pending requests can be approved" }, { status: 400 });
    }

    if (meetingRequest.awaiting_user_id !== authUser.id) {
      return NextResponse.json({ error: "Only the awaiting user can approve this request" }, { status: 403 });
    }

    const counterpartyId = getCounterpartyId(meetingRequest, authUser.id);

    const { error: updateError } = await supabase
      .from("meeting_requests")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        rejected_at: null,
        awaiting_user_id: authUser.id,
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
        event_type: "approved",
        proposal_id: meetingRequest.current_proposal_id,
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
    console.error("Approve meeting request error:", error);
    return meetingRequestsErrorResponse(error, "Failed to approve meeting request");
  }
}
