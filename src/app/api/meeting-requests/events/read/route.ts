import { NextRequest, NextResponse } from "next/server";
import { ensureVipUser, getAuthContext, meetingRequestsErrorResponse } from "../../helpers";

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if ("response" in auth) return auth.response;

    const { supabase, authUser } = auth;
    const vipCheck = await ensureVipUser(supabase, authUser.id);
    if (vipCheck) return vipCheck;

    const body = await request.json().catch(() => ({}));
    const requestIds = Array.isArray(body.request_ids) ? body.request_ids : [];
    const markAll = body.mark_all === true;

    let updateQuery = supabase
      .from("meeting_request_events")
      .update({ is_read: true })
      .eq("target_user_id", authUser.id)
      .eq("is_read", false);

    if (!markAll && requestIds.length > 0) {
      updateQuery = updateQuery.in("meeting_request_id", requestIds);
    }

    const { error } = await updateQuery;

    if (error) throw error;

    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    console.error("Mark meeting request events as read error:", error);
    return meetingRequestsErrorResponse(error, "Failed to mark meeting request events as read");
  }
}
