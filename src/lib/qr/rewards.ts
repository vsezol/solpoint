/**
 * Reward service: definitions and grants for event check-in and future NFT.
 * Off-chain first: earned/claimable in DB; NFT minting can be added later.
 */

import { createClient, type SupabaseClient } from "@/lib/supabase/server";

export type RewardDefinitionKind = "badge" | "nft";
export type RewardGrantStatus =
  | "earned"
  | "claimable"
  | "mint_pending"
  | "minted"
  | "revoked";
export type RewardGrantSourceType = "event_checkin" | "manual" | "migration";

export interface RewardDefinitionRecord {
  id: string;
  scope_type: "event" | "system";
  scope_id: string | null;
  code: string;
  kind: RewardDefinitionKind;
  title: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
}

export interface RewardGrantRecord {
  id: string;
  reward_definition_id: string;
  user_id: string;
  event_id: string | null;
  source_type: RewardGrantSourceType;
  source_ref_id: string | null;
  status: RewardGrantStatus;
  earned_at: string;
  updated_at: string;
}

const VERIFIED_ATTENDEE_CODE = "verified_attendee";

/**
 * Ensure an event has a reward definition for verified attendee (e.g. for check-in).
 * Idempotent: returns existing or creates one.
 */
export async function ensureEventRewardDefinition(
  eventId: string,
  options?: {
    title?: string;
    description?: string;
    createdBy?: string | null;
    supabase?: SupabaseClient;
  }
): Promise<RewardDefinitionRecord> {
  const supabase = options?.supabase ?? (await createClient());

  const { data: existing, error: fetchError } = await supabase
    .from("reward_definitions")
    .select("id, scope_type, scope_id, code, kind, title, description, image_url, is_active")
    .eq("scope_type", "event")
    .eq("scope_id", eventId)
    .eq("code", VERIFIED_ATTENDEE_CODE)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing) {
    return existing as RewardDefinitionRecord;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("reward_definitions")
    .insert({
      scope_type: "event",
      scope_id: eventId,
      code: VERIFIED_ATTENDEE_CODE,
      kind: "badge",
      title: options?.title ?? "Verified attendee",
      description: options?.description ?? null,
      created_by: options?.createdBy ?? null,
    })
    .select("id, scope_type, scope_id, code, kind, title, description, image_url, is_active")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: refetched } = await supabase
        .from("reward_definitions")
        .select("id, scope_type, scope_id, code, kind, title, description, image_url, is_active")
        .eq("scope_type", "event")
        .eq("scope_id", eventId)
        .eq("code", VERIFIED_ATTENDEE_CODE)
        .single();
      if (refetched) {
        return refetched as RewardDefinitionRecord;
      }
    }
    throw insertError;
  }

  return inserted as RewardDefinitionRecord;
}

/**
 * Grant a reward to a user (e.g. on event check-in).
 * Idempotent for the same (definition, user, event, source_type): no duplicate grant.
 */
export async function grantReward(params: {
  rewardDefinitionId: string;
  userId: string;
  eventId: string | null;
  sourceType: RewardGrantSourceType;
  sourceRefId?: string | null;
  status?: RewardGrantStatus;
  supabase?: SupabaseClient;
}): Promise<RewardGrantRecord> {
  const supabase = params.supabase ?? (await createClient());
  const status = params.status ?? "earned";

  const { data: inserted, error: insertError } = await supabase
    .from("reward_grants")
    .insert({
      reward_definition_id: params.rewardDefinitionId,
      user_id: params.userId,
      event_id: params.eventId,
      source_type: params.sourceType,
      source_ref_id: params.sourceRefId ?? null,
      status,
    })
    .select("id, reward_definition_id, user_id, event_id, source_type, source_ref_id, status, earned_at, updated_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const existing = await getRewardState({
        rewardDefinitionId: params.rewardDefinitionId,
        userId: params.userId,
        eventId: params.eventId,
        supabase,
      });
      if (existing) {
        return existing;
      }
    }
    throw insertError;
  }

  return inserted as RewardGrantRecord;
}

export interface RewardStateResult {
  grant: RewardGrantRecord;
  definition: RewardDefinitionRecord;
}

/**
 * Get current reward state for a user (e.g. did they earn verified_attendee for this event).
 */
export async function getRewardState(params: {
  rewardDefinitionId: string;
  userId: string;
  eventId: string | null;
  supabase?: SupabaseClient;
}): Promise<RewardStateResult | null> {
  const supabase = params.supabase ?? (await createClient());

  const { data: grant, error: grantError } = await supabase
    .from("reward_grants")
    .select("id, reward_definition_id, user_id, event_id, source_type, source_ref_id, status, earned_at, updated_at")
    .eq("reward_definition_id", params.rewardDefinitionId)
    .eq("user_id", params.userId)
    .eq("event_id", params.eventId)
    .maybeSingle();

  if (grantError || !grant) {
    return null;
  }

  const { data: definition, error: defError } = await supabase
    .from("reward_definitions")
    .select("id, scope_type, scope_id, code, kind, title, description, image_url, is_active")
    .eq("id", params.rewardDefinitionId)
    .single();

  if (defError || !definition) {
    return null;
  }

  return {
    grant: grant as RewardGrantRecord,
    definition: definition as RewardDefinitionRecord,
  };
}
