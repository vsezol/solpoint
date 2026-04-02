import { NextResponse } from "next/server";
import { ensureVipUser, getAuthContext, meetingRequestsErrorResponse } from "../helpers";

export async function GET() {
  try {
    const auth = await getAuthContext();
    if ("response" in auth) return auth.response;

    const { supabase, authUser } = auth;
    const vipCheck = await ensureVipUser(supabase, authUser.id);
    if (vipCheck) return vipCheck;

    const [actionNeededResult, incomingPendingResult, incomingRescheduledResult] = await Promise.all([
      supabase
        .from("meeting_requests")
        .select("id", { count: "exact", head: true })
        .eq("awaiting_user_id", authUser.id)
        .eq("status", "pending"),
      supabase
        .from("meeting_requests")
        .select("id", { count: "exact", head: true })
        .eq("responder_id", authUser.id)
        .eq("awaiting_user_id", authUser.id)
        .eq("status", "pending"),
      supabase
        .from("meeting_request_events")
        .select("id", { count: "exact", head: true })
        .eq("target_user_id", authUser.id)
        .eq("event_type", "rescheduled")
        .eq("is_read", false),
    ]);

    if (actionNeededResult.error) throw actionNeededResult.error;
    if (incomingPendingResult.error) throw incomingPendingResult.error;
    if (incomingRescheduledResult.error) throw incomingRescheduledResult.error;

    return NextResponse.json({
      data: {
        action_needed_count: actionNeededResult.count || 0,
        incoming_pending_count: incomingPendingResult.count || 0,
        incoming_reschedule_count: incomingRescheduledResult.count || 0,
      },
    });
  } catch (error: any) {
    console.error("Get meeting request counts error:", error);
    return meetingRequestsErrorResponse(error, "Failed to get meeting request counts");
  }
}
