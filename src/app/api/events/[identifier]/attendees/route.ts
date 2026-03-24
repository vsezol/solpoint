import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { INTEREST_SLUGS, USER_ROLE_VALUES, resolveSkillSlug } from "@/lib/profile-taxonomy";
import {
  computeBestMatchScore,
  countSetOverlap,
  isCompleteProfile,
} from "@/lib/matching/profile-matching";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";

type ProfileRow = {
  id: string;
  twitter_handle: string | null;
  twitter_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  about: string | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  role: string | null;
  socials: Record<string, unknown> | null;
  subscription_tier: "free" | "vip";
  is_verified: boolean;
  created_at: string;
  countries?: { name?: string } | { name?: string }[] | null;
};

type EventMemberRow = {
  user_id: string;
  registered_at: string;
  user: ProfileRow | ProfileRow[] | null;
};

type InterestRow = {
  id: string;
  slug: string;
  name: string;
};

type ProfileInterestJoinRow = {
  user_id: string;
  interest: InterestRow | InterestRow[] | null;
};

type AttendeeItem = {
  id: string;
  avatar_url: string | null;
  name: string;
  twitter_handle: string | null;
  isVip: boolean;
  isVerified: boolean;
  role: string | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  about: string | null;
  interests: InterestRow[];
  is_complete_profile: boolean;
  match_score: number;
  interest_overlap_count: number;
  skill_overlap_count: number;
  shared_events_count: number;
  registered_at: string;
};

type ProfileSkillRow = {
  user_id: string;
  name: string | null;
};

type EventMemberEventRow = {
  user_id: string;
  event_id: string;
};

function toSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseBoolean(value: string | null): boolean {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const { identifier } = await params;
  const supabase = await createClient();

  const eventId = await getEntityIdByIdentifier("event", identifier);
  if (!eventId) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const requestedRoles = parseCsv(searchParams.get("roles"));
  if (
    requestedRoles.some(
      (role) => !USER_ROLE_VALUES.includes(role as (typeof USER_ROLE_VALUES)[number])
    )
  ) {
    return NextResponse.json({ error: "Invalid roles filter" }, { status: 400 });
  }

  const requestedCountryCodeRaw = searchParams.get("country_code");
  const requestedCountryCode = requestedCountryCodeRaw
    ? requestedCountryCodeRaw.trim().toUpperCase()
    : "";
  if (requestedCountryCode && requestedCountryCode.length !== 2) {
    return NextResponse.json(
      { error: "country_code must be an ISO alpha-2 code" },
      { status: 400 }
    );
  }

  const requestedInterestSlugs = parseCsv(searchParams.get("interest_slugs")).map((slug) =>
    slug.toLowerCase()
  );
  if (requestedInterestSlugs.some((slug) => !INTEREST_SLUGS.has(slug))) {
    return NextResponse.json(
      { error: "Invalid interest_slugs filter" },
      { status: 400 }
    );
  }

  const bestMatches = parseBoolean(searchParams.get("best_matches"));
  const completeProfilesOnly = parseBoolean(searchParams.get("complete_profiles"));

  const pageRaw = Number.parseInt(searchParams.get("page") || "1", 10);
  const pageSizeRaw = Number.parseInt(searchParams.get("page_size") || "20", 10);
  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
  const pageSize = Number.isNaN(pageSizeRaw) || pageSizeRaw < 1 ? 20 : Math.min(pageSizeRaw, 100);

  const { data: membersRaw, error: membersError } = await supabase
    .from("event_members")
    .select(
      `
      user_id,
      registered_at,
      user:profiles!event_members_user_id_fkey(
        id,
        twitter_handle,
        twitter_name,
        avatar_url,
        bio,
        about,
        country,
        country_code,
        city,
        role,
        socials,
        subscription_tier,
        is_verified,
        created_at,
        countries!fk_profiles_country_code(name)
      )
    `
    )
    .eq("event_id", eventId)
    .eq("status", "going")
    .order("registered_at", { ascending: false });

  if (membersError) {
    return NextResponse.json(
      { error: membersError.message || "Failed to fetch attendees" },
      { status: 500 }
    );
  }

  const members = ((membersRaw || []) as EventMemberRow[])
    .map((row) => ({
      user_id: row.user_id,
      registered_at: row.registered_at,
      user: toSingle(row.user),
    }))
    .filter((row): row is { user_id: string; registered_at: string; user: ProfileRow } => Boolean(row.user));

  if (members.length === 0) {
    return NextResponse.json(
      {
        items: [],
        page,
        page_size: pageSize,
        total: 0,
        total_pages: 0,
      },
      { status: 200 }
    );
  }

  const userIds = Array.from(new Set(members.map((member) => member.user.id)));

  const [
    skillsResult,
    experienceResult,
    interestsResult,
    currentUserProfileResult,
    currentUserInterestsResult,
    currentUserSkillsResult,
    attendeeEventsResult,
    currentUserEventsResult,
  ] = await Promise.all([
    supabase.from("profile_skills").select("user_id, name").in("user_id", userIds),
    supabase.from("profile_experience").select("user_id").in("user_id", userIds),
    supabase
      .from("profile_interests")
      .select("user_id, interest:interests(id, slug, name)")
      .in("user_id", userIds),
    bestMatches
      ? supabase.from("profiles").select("role").eq("id", authUser.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    bestMatches
      ? supabase
          .from("profile_interests")
          .select("interest:interests(slug)")
          .eq("user_id", authUser.id)
      : Promise.resolve({ data: [], error: null }),
    bestMatches
      ? supabase.from("profile_skills").select("name").eq("user_id", authUser.id)
      : Promise.resolve({ data: [], error: null }),
    bestMatches
      ? supabase
          .from("event_members")
          .select("user_id, event_id")
          .in("user_id", userIds)
          .eq("status", "going")
      : Promise.resolve({ data: [], error: null }),
    bestMatches
      ? supabase
          .from("event_members")
          .select("event_id")
          .eq("user_id", authUser.id)
          .eq("status", "going")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (skillsResult.error) {
    return NextResponse.json(
      { error: skillsResult.error.message || "Failed to fetch attendee skills" },
      { status: 500 }
    );
  }

  if (experienceResult.error) {
    return NextResponse.json(
      { error: experienceResult.error.message || "Failed to fetch attendee experience" },
      { status: 500 }
    );
  }

  if (interestsResult.error) {
    return NextResponse.json(
      { error: interestsResult.error.message || "Failed to fetch attendee interests" },
      { status: 500 }
    );
  }

  if (currentUserProfileResult.error) {
    return NextResponse.json(
      { error: currentUserProfileResult.error.message || "Failed to fetch current user profile" },
      { status: 500 }
    );
  }

  if (currentUserInterestsResult.error) {
    return NextResponse.json(
      { error: currentUserInterestsResult.error.message || "Failed to fetch current user interests" },
      { status: 500 }
    );
  }

  if (currentUserSkillsResult.error) {
    return NextResponse.json(
      { error: currentUserSkillsResult.error.message || "Failed to fetch current user skills" },
      { status: 500 }
    );
  }

  if (attendeeEventsResult.error) {
    return NextResponse.json(
      { error: attendeeEventsResult.error.message || "Failed to fetch attendee events" },
      { status: 500 }
    );
  }

  if (currentUserEventsResult.error) {
    return NextResponse.json(
      { error: currentUserEventsResult.error.message || "Failed to fetch current user events" },
      { status: 500 }
    );
  }

  const skillsByUser = new Map<string, Set<string>>();
  for (const row of (skillsResult.data || []) as ProfileSkillRow[]) {
    const skillSlug = resolveSkillSlug(row.name);
    if (!skillSlug) continue;
    const set = skillsByUser.get(row.user_id) || new Set<string>();
    set.add(skillSlug);
    skillsByUser.set(row.user_id, set);
  }

  const experienceByUser = new Map<string, number>();
  for (const row of (experienceResult.data || []) as { user_id: string }[]) {
    experienceByUser.set(row.user_id, (experienceByUser.get(row.user_id) || 0) + 1);
  }

  const interestsByUser = new Map<string, InterestRow[]>();
  for (const row of (interestsResult.data || []) as ProfileInterestJoinRow[]) {
    const interest = toSingle(row.interest);
    if (!interest) continue;
    const list = interestsByUser.get(row.user_id) || [];
    list.push(interest);
    interestsByUser.set(row.user_id, list);
  }

  const eventIdsByUser = new Map<string, Set<string>>();
  for (const row of (attendeeEventsResult.data || []) as EventMemberEventRow[]) {
    const set = eventIdsByUser.get(row.user_id) || new Set<string>();
    set.add(row.event_id);
    eventIdsByUser.set(row.user_id, set);
  }

  const currentUserRole = (currentUserProfileResult.data as { role?: string | null } | null)?.role || null;
  const currentUserInterestSlugs = new Set(
    ((currentUserInterestsResult.data || []) as Array<{ interest: { slug: string } | { slug: string }[] | null }>)
      .map((row) => {
        const interest = toSingle(row.interest);
        return interest?.slug;
      })
      .filter((slug: string | undefined): slug is string => Boolean(slug))
  );
  const currentUserSkillSet = new Set(
    ((currentUserSkillsResult.data || []) as Array<{ name: string | null }>)
      .map((row) => resolveSkillSlug(row.name))
      .filter((slug): slug is string => Boolean(slug))
  );
  const currentUserEventIds = new Set(
    ((currentUserEventsResult.data || []) as Array<{ event_id: string }>).map((row) => row.event_id)
  );
  // Exclude the currently selected event from shared-events scoring.
  currentUserEventIds.delete(eventId);

  const attendees: AttendeeItem[] = members.map((member) => {
    const user = member.user;
    const countriesRel = toSingle(user.countries || null);
    const interests = interestsByUser.get(user.id) || [];
    const interestSlugSet = new Set(interests.map((interest) => interest.slug));
    const skillSet = skillsByUser.get(user.id) || new Set<string>();
    const attendeeEventIds = eventIdsByUser.get(user.id) || new Set<string>();
    attendeeEventIds.delete(eventId);

    const about = user.about?.trim() || null;
    const countryCode = user.country_code ? user.country_code.toUpperCase() : null;

    const hasCompleteProfile = isCompleteProfile({
      about,
      countryCode,
      role: user.role,
      skillCount: skillSet.size,
      interestCount: interests.length,
      experienceCount: experienceByUser.get(user.id) || 0,
    });

    let matchScore = 0;
    let interestOverlapCount = 0;
    let skillOverlapCount = 0;
    let sharedEventsCount = 0;
    if (bestMatches) {
      interestOverlapCount = countSetOverlap(currentUserInterestSlugs, interestSlugSet);
      skillOverlapCount = countSetOverlap(currentUserSkillSet, skillSet);
      sharedEventsCount = countSetOverlap(currentUserEventIds, attendeeEventIds);

      matchScore = computeBestMatchScore({
        hasRoleMatch: Boolean(currentUserRole && user.role && currentUserRole === user.role),
        interestOverlapCount,
        skillOverlapCount,
        sharedEventsCount,
      });
    }

    return {
      id: user.id,
      avatar_url: user.avatar_url,
      name: user.twitter_name || user.twitter_handle || "User",
      twitter_handle: user.twitter_handle,
      isVip: user.subscription_tier === "vip",
      isVerified: user.is_verified,
      role: user.role,
      country: countriesRel?.name || user.country,
      country_code: countryCode,
      city: user.city,
      about,
      interests,
      is_complete_profile: hasCompleteProfile,
      match_score: matchScore,
      interest_overlap_count: interestOverlapCount,
      skill_overlap_count: skillOverlapCount,
      shared_events_count: sharedEventsCount,
      registered_at: member.registered_at,
    };
  });

  const filtered = attendees.filter((attendee) => {
    if (requestedRoles.length > 0 && (!attendee.role || !requestedRoles.includes(attendee.role))) {
      return false;
    }

    if (requestedCountryCode && attendee.country_code !== requestedCountryCode) {
      return false;
    }

    if (requestedInterestSlugs.length > 0) {
      const attendeeInterestSlugs = new Set(attendee.interests.map((interest) => interest.slug));
      const hasOverlap = requestedInterestSlugs.some((slug) => attendeeInterestSlugs.has(slug));
      if (!hasOverlap) {
        return false;
      }
    }

    if (completeProfilesOnly && !attendee.is_complete_profile) {
      return false;
    }

    if (bestMatches && attendee.match_score <= 0) {
      return false;
    }

    return true;
  });

  const sorted = filtered.sort((a, b) => {
    if (bestMatches) {
      if (b.match_score !== a.match_score) {
        return b.match_score - a.match_score;
      }
    }
    return new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime();
  });

  const total = sorted.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  return NextResponse.json(
    {
      items,
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
    },
    { status: 200 }
  );
}
