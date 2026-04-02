import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isProfileQrEnabled } from "@/lib/qr/feature-flags";
import {
  getProfileQrRelationship,
  mapFollowStatusToFriendshipStatus,
  resolveProfileQrTarget,
  upsertProfileQrScan,
  type FollowStatus,
} from "@/lib/qr/profile";
import { checkConnectRateLimit } from "@/lib/qr/rate-limit";
import { isUUID } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!isProfileQrEnabled()) {
    return NextResponse.json({ error: "Profile QR is disabled" }, { status: 404 });
  }

  if (!checkConnectRateLimit(request)) {
    return NextResponse.json(
      { error: "Too many connection requests. Try again later." },
      { status: 429 }
    );
  }

  try {
    const { token } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const target = await resolveProfileQrTarget(token);
    if (!target) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }

    if (target.profile.id === authUser.id) {
      return NextResponse.json(
        { error: "You cannot connect with yourself" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const scanSessionId =
      typeof body.scanSessionId === "string" ? body.scanSessionId : null;

    let scanId: string | undefined;
    if (scanSessionId && isUUID(scanSessionId)) {
      const scanResult = await upsertProfileQrScan({
        publicToken: token,
        scanSessionId,
        scannerProfileId: authUser.id,
        supabaseForWrite: createServiceRoleClient(),
      });
      scanId = scanResult?.id || undefined;
    }

    const { data: rawStatus } = (await supabase.rpc("get_follow_status", {
      p_user_id: authUser.id,
      p_other_user_id: target.profile.id,
    })) as { data: FollowStatus | null };

    const followStatus = rawStatus ?? "none";

    if (followStatus === "following") {
      return NextResponse.json({
        relationship: "pending_sent",
        action: "already_pending",
        scanId,
      });
    }

    if (followStatus === "mutual") {
      return NextResponse.json({
        relationship: "accepted",
        action: "already_connected",
        scanId,
      });
    }

    const { data: follow, error: insertError } = await supabase
      .from("follows")
      .insert({
        follower_id: authUser.id,
        following_id: target.profile.id,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const relationship = await getProfileQrRelationship(
          authUser.id,
          target.profile.id
        );

        return NextResponse.json({
          relationship,
          action:
            relationship === "accepted"
              ? "already_connected"
              : "already_pending",
          scanId,
        });
      }

      throw insertError;
    }

    const relationship =
      followStatus === "follower"
        ? "accepted"
        : mapFollowStatusToFriendshipStatus("following");

    const action =
      followStatus === "follower"
        ? "request_completed_mutual"
        : "request_created";

    const { error: connectEventError } = await supabase
      .from("profile_qr_connect_events")
      .insert({
        qr_code_id: target.qrCode.id,
        scan_id: scanId ?? null,
        requester_profile_id: authUser.id,
        target_profile_id: target.profile.id,
        follow_id: follow?.id ?? null,
        result_status: relationship,
      });

    if (connectEventError) {
      throw connectEventError;
    }

    return NextResponse.json({
      relationship,
      action,
      scanId,
    });
  } catch (error: unknown) {
    console.error("Profile QR connect error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create connection request",
      },
      { status: 500 }
    );
  }
}
