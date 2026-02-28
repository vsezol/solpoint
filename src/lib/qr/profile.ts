import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl, isUUID } from "@/lib/utils";
import type { User } from "@/types";
import type { FriendshipStatus } from "@/types/profile";

export type FollowStatus = "none" | "following" | "follower" | "mutual";

export interface ProfileQrCodeRecord {
  id: string;
  public_token: string;
  profile_id: string;
  created_at: string;
  is_active: boolean;
}

export interface ProfileQrResolvedTarget {
  qrCode: ProfileQrCodeRecord;
  profile: Pick<
    User,
    | "id"
    | "twitter_handle"
    | "twitter_name"
    | "avatar_url"
    | "bio"
    | "role"
    | "is_open_to_meet"
    | "subscription_tier"
    | "is_verified"
  >;
}

export interface ProfileQrViewModel {
  id: string;
  publicToken: string;
  imageUrl: string;
  scanUrl: string;
  createdAt: string;
}

export interface UpsertProfileQrScanInput {
  publicToken: string;
  scanSessionId: string;
  scannerProfileId?: string | null;
  /** If provided, used for the upsert to bypass RLS (e.g. service role from API route). */
  supabaseForWrite?: SupabaseClient;
}

export interface UpsertProfileQrScanResult {
  id: string;
  relationship: FriendshipStatus;
  isOwnQr: boolean;
}

export function isValidQrPublicToken(value: string): boolean {
  return isUUID(value);
}

export function mapFollowStatusToFriendshipStatus(
  status: FollowStatus
): FriendshipStatus {
  if (status === "mutual") {
    return "accepted";
  }

  if (status === "following") {
    return "pending_sent";
  }

  if (status === "follower") {
    return "pending_received";
  }

  return "none";
}

export function buildProfileQrPath(publicToken: string): string {
  return `/u/${publicToken}`;
}

export function buildProfileQrScanUrl(publicToken: string): string {
  return `${getAppUrl()}${buildProfileQrPath(publicToken)}`;
}

export function buildProfileQrImageUrl(publicToken: string): string {
  return `/api/qr/profile/${publicToken}/image`;
}

export function toProfileQrViewModel(record: ProfileQrCodeRecord): ProfileQrViewModel {
  return {
    id: record.id,
    publicToken: record.public_token,
    imageUrl: buildProfileQrImageUrl(record.public_token),
    scanUrl: buildProfileQrScanUrl(record.public_token),
    createdAt: record.created_at,
  };
}

export async function ensureProfileQrForUser(
  userId: string
): Promise<ProfileQrCodeRecord> {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("qr_codes")
    .select("id, public_token, profile_id, created_at, is_active")
    .eq("type", "profile")
    .eq("profile_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as ProfileQrCodeRecord;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("qr_codes")
    .insert({
      type: "profile",
      profile_id: userId,
      created_by: userId,
    })
    .select("id, public_token, profile_id, created_at, is_active")
    .single();

  if (!insertError && inserted) {
    return inserted as ProfileQrCodeRecord;
  }

  // Handle a race on the unique active-profile index by refetching.
  const { data: refetched, error: refetchError } = await supabase
    .from("qr_codes")
    .select("id, public_token, profile_id, created_at, is_active")
    .eq("type", "profile")
    .eq("profile_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (refetchError) {
    throw refetchError;
  }

  if (!refetched) {
    throw insertError ?? new Error("Failed to create profile QR code");
  }

  return refetched as ProfileQrCodeRecord;
}

export async function resolveProfileQrTarget(
  publicToken: string
): Promise<ProfileQrResolvedTarget | null> {
  if (!isValidQrPublicToken(publicToken)) {
    return null;
  }

  const supabase = await createClient();
  const { data: qrCode, error: qrCodeError } = await supabase
    .from("qr_codes")
    .select("id, public_token, profile_id, created_at, is_active")
    .eq("type", "profile")
    .eq("public_token", publicToken)
    .eq("is_active", true)
    .maybeSingle();

  if (qrCodeError) {
    throw qrCodeError;
  }

  if (!qrCode) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      [
        "id",
        "twitter_handle",
        "twitter_name",
        "avatar_url",
        "bio",
        "role",
        "is_open_to_meet",
        "subscription_tier",
        "is_verified",
      ].join(", ")
    )
    .eq("id", qrCode.profile_id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    return null;
  }

  return {
    qrCode: qrCode as ProfileQrCodeRecord,
    profile: profile as unknown as ProfileQrResolvedTarget["profile"],
  };
}

export async function getProfileQrRelationship(
  viewerProfileId: string,
  targetProfileId: string
): Promise<FriendshipStatus> {
  if (viewerProfileId === targetProfileId) {
    return "accepted";
  }

  const supabase = await createClient();
  const { data } = (await supabase.rpc("get_follow_status", {
    p_user_id: viewerProfileId,
    p_other_user_id: targetProfileId,
  })) as { data: FollowStatus | null };

  return mapFollowStatusToFriendshipStatus(data ?? "none");
}

export async function upsertProfileQrScan({
  publicToken,
  scanSessionId,
  scannerProfileId = null,
  supabaseForWrite,
}: UpsertProfileQrScanInput): Promise<UpsertProfileQrScanResult | null> {
  const target = await resolveProfileQrTarget(publicToken);
  if (!target) {
    return null;
  }

  if (scannerProfileId && scannerProfileId === target.profile.id) {
    return {
      id: "",
      relationship: "accepted",
      isOwnQr: true,
    };
  }

  const relationship = scannerProfileId
    ? await getProfileQrRelationship(scannerProfileId, target.profile.id)
    : "none";

  const supabase = supabaseForWrite ?? (await createClient());
  const now = new Date().toISOString();
  const { data: scan, error } = await supabase
    .from("profile_qr_scans")
    .upsert(
      {
        qr_code_id: target.qrCode.id,
        scan_session_id: scanSessionId,
        scanned_profile_id: target.profile.id,
        scanner_profile_id: scannerProfileId,
        authenticated_at: scannerProfileId ? now : null,
        last_seen_at: now,
      },
      {
        onConflict: "qr_code_id,scan_session_id",
      }
    )
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: scan?.id ?? "",
    relationship,
    isOwnQr: false,
  };
}
