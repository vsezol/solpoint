import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { INTEREST_SLUGS, resolveSkillSlug } from "@/lib/profile-taxonomy";
import {
  computeBestMatchScore,
  countSetOverlap,
  isCompleteProfile,
} from "@/lib/matching/profile-matching";
import { parseBoundedInt } from "@/lib/security/request-guards";
import { isUUID } from "@/lib/utils";

const USERS_PUBLIC_FIELDS = `
  id,
  twitter_handle,
  twitter_name,
  avatar_url,
  about,
  bio,
  country,
  country_code,
  city,
  role,
  is_open_to_meet,
  subscription_tier,
  is_verified,
  last_active_at,
  created_at,
  updated_at
`;

type ProfileRow = {
  id: string;
  role: string | null;
  about: string | null;
  bio?: string | null;
  country_code: string | null;
  created_at: string;
  subscription_tier?: "free" | "vip";
  [key: string]: unknown;
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

type ProfileSkillRow = {
  user_id: string;
  name: string | null;
};

type EventMemberRow = {
  user_id: string;
  event_id: string;
};

type UserWithMatch = ProfileRow & {
  is_complete_profile: boolean;
  match_score: number;
  interest_overlap_count: number;
  skill_overlap_count: number;
  shared_events_count: number;
};

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value: string | null): boolean {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

function toSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

/**
 * GET /api/users
 * Список пользователей с фильтрами для карты
 *
 * Query params:
 * - country: фильтр по стране
 * - country_code: фильтр по коду страны (ISO 3166-1 alpha-2)
 * - city: фильтр по городу
 * - role: фильтр по роли
 * - roles: CSV ролей
 * - interest_slugs: CSV профильных интересов (OR-match)
 * - open_to_meet: legacy filter
 * - active_only: legacy filter
 * - mutual_friends_only: legacy filter
 * - best_matches: v2 score-based matching filter
 * - complete_profiles: v2 complete-profile filter
 * - current_user_id: required when best_matches=true (must match authenticated user)
 * - limit: количество результатов (максимум 200)
 * - offset: смещение для пагинации
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const mutualFriendsOnly = parseBoolean(searchParams.get("mutual_friends_only"));
  const bestMatches = parseBoolean(searchParams.get("best_matches"));
  const completeProfilesOnly = parseBoolean(searchParams.get("complete_profiles"));
  const requestedCurrentUserId = searchParams.get("current_user_id");
  const shouldEnrichProfiles = bestMatches || completeProfilesOnly;

  if (requestedCurrentUserId && !isUUID(requestedCurrentUserId)) {
    return NextResponse.json(
      { error: "current_user_id must be a valid UUID" },
      { status: 400 }
    );
  }

  if (bestMatches) {
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required for best_matches filter" },
        { status: 401 }
      );
    }

    if (!requestedCurrentUserId) {
      return NextResponse.json(
        { error: "current_user_id is required when best_matches=true" },
        { status: 400 }
      );
    }

    if (requestedCurrentUserId !== authUser.id) {
      return NextResponse.json(
        { error: "current_user_id does not match current session" },
        { status: 403 }
      );
    }
  }

  if (mutualFriendsOnly) {
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required for mutual_friends_only filter" },
        { status: 401 }
      );
    }

    if (requestedCurrentUserId && requestedCurrentUserId !== authUser.id) {
      return NextResponse.json(
        { error: "current_user_id does not match current session" },
        { status: 403 }
      );
    }
  }

  const bestMatchUserId = bestMatches ? authUser!.id : null;
  const mutualFilterUserId = mutualFriendsOnly ? authUser!.id : null;

  const requestedInterestSlugs = parseCsv(searchParams.get("interest_slugs")).map((slug) =>
    slug.toLowerCase()
  );
  if (requestedInterestSlugs.some((slug) => !INTEREST_SLUGS.has(slug))) {
    return NextResponse.json({ error: "Invalid interest_slugs filter" }, { status: 400 });
  }

  /** Restrict profiles to these ids (intersection of mutual friends + interests as needed). */
  let idFilter: string[] | null = null;

  if (mutualFilterUserId) {
    const { data: mutualFriends, error: mutualFriendsError } = await supabase
      .from("mutual_friends")
      .select("user_id, friend_id")
      .or(`user_id.eq.${mutualFilterUserId},friend_id.eq.${mutualFilterUserId}`);

    if (mutualFriendsError) {
      console.error("Error fetching mutual friends:", mutualFriendsError);
      return NextResponse.json({ error: "Failed to fetch mutual friends" }, { status: 500 });
    }

    const friendIds =
      mutualFriends
        ?.map((mf) => (mf.user_id === mutualFilterUserId ? mf.friend_id : mf.user_id))
        .filter((id) => id !== mutualFilterUserId) || [];

    if (friendIds.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    idFilter = friendIds;
  }

  if (requestedInterestSlugs.length > 0) {
    const { data: interestRows, error: interestsError } = await supabase
      .from("interests")
      .select("id")
      .in("slug", requestedInterestSlugs);

    if (interestsError) {
      console.error("Error resolving interest slugs:", interestsError);
      return NextResponse.json(
        { error: interestsError.message || "Failed to resolve interests" },
        { status: 500 }
      );
    }

    const interestIds = (interestRows || []).map((row) => row.id);
    if (interestIds.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const { data: profileInterestRows, error: profileInterestsError } = await supabase
      .from("profile_interests")
      .select("user_id")
      .in("interest_id", interestIds);

    if (profileInterestsError) {
      console.error("Error fetching profile_interests:", profileInterestsError);
      return NextResponse.json(
        { error: profileInterestsError.message || "Failed to fetch profile interests" },
        { status: 500 }
      );
    }

    const interestUserIds = [...new Set((profileInterestRows || []).map((row) => row.user_id))];
    if (interestUserIds.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    if (idFilter) {
      const allowed = new Set(interestUserIds);
      idFilter = idFilter.filter((id) => allowed.has(id));
    } else {
      idFilter = interestUserIds;
    }

    if (idFilter.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }
  }

  let query = supabase.from("profiles").select(USERS_PUBLIC_FIELDS);

  if (idFilter) {
    query = query.in("id", idFilter);
  }

  const countryCode = searchParams.get("country_code");
  if (countryCode) {
    query = query.eq("country_code", countryCode.toUpperCase());
  } else {
    const country = searchParams.get("country");
    if (country) {
      query = query.eq("country", country);
    }
  }

  const city = searchParams.get("city");
  if (city) {
    query = query.ilike("city", `%${city}%`);
  }

  const role = searchParams.get("role");
  if (role) {
    query = query.eq("role", role);
  }

  const roles = parseCsv(searchParams.get("roles")).slice(0, 10);
  if (roles.length > 0) {
    query = query.in("role", roles);
  }

  const openToMeet = parseBoolean(searchParams.get("open_to_meet"));
  if (openToMeet) {
    query = query.eq("is_open_to_meet", true);
  }

  const activeOnly = parseBoolean(searchParams.get("active_only"));
  if (activeOnly) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query = query.gte("last_active_at", thirtyDaysAgo.toISOString());
  }

  const { data: usersRaw, error: usersError } = await query;
  if (usersError) {
    console.error("Error fetching users:", usersError);
    return NextResponse.json(
      { error: usersError.message || "Failed to fetch users" },
      { status: 500 }
    );
  }

  const users = (usersRaw || []) as ProfileRow[];
  if (users.length === 0) {
    return NextResponse.json({ users: [] }, { status: 200 });
  }

  const userIds = [...new Set(users.map((user) => user.id))];

  const [
    profileSkillsResult,
    profileExperienceResult,
    profileInterestsResult,
    viewerProfileResult,
    viewerInterestsResult,
    viewerSkillsResult,
    profileEventsResult,
    viewerEventsResult,
  ] = await Promise.all([
    shouldEnrichProfiles
      ? supabase.from("profile_skills").select("user_id, name").in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    shouldEnrichProfiles
      ? supabase.from("profile_experience").select("user_id").in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    shouldEnrichProfiles
      ? supabase
          .from("profile_interests")
          .select("user_id, interest:interests(id, slug, name)")
          .in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    bestMatches && bestMatchUserId
      ? supabase.from("profiles").select("role").eq("id", bestMatchUserId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    bestMatches && bestMatchUserId
      ? supabase
          .from("profile_interests")
          .select("interest:interests(slug)")
          .eq("user_id", bestMatchUserId)
      : Promise.resolve({ data: [], error: null }),
    bestMatches && bestMatchUserId
      ? supabase.from("profile_skills").select("name").eq("user_id", bestMatchUserId)
      : Promise.resolve({ data: [], error: null }),
    bestMatches
      ? supabase
          .from("event_members")
          .select("user_id, event_id")
          .in("user_id", userIds)
          .eq("status", "going")
      : Promise.resolve({ data: [], error: null }),
    bestMatches && bestMatchUserId
      ? supabase
          .from("event_members")
          .select("event_id")
          .eq("user_id", bestMatchUserId)
          .eq("status", "going")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profileSkillsResult.error) {
    return NextResponse.json(
      { error: profileSkillsResult.error.message || "Failed to fetch profile skills" },
      { status: 500 }
    );
  }
  if (profileExperienceResult.error) {
    return NextResponse.json(
      { error: profileExperienceResult.error.message || "Failed to fetch profile experience" },
      { status: 500 }
    );
  }
  if (profileInterestsResult.error) {
    return NextResponse.json(
      { error: profileInterestsResult.error.message || "Failed to fetch profile interests" },
      { status: 500 }
    );
  }
  if (viewerProfileResult.error) {
    return NextResponse.json(
      { error: viewerProfileResult.error.message || "Failed to fetch current user profile" },
      { status: 500 }
    );
  }
  if (viewerInterestsResult.error) {
    return NextResponse.json(
      { error: viewerInterestsResult.error.message || "Failed to fetch current user interests" },
      { status: 500 }
    );
  }
  if (viewerSkillsResult.error) {
    return NextResponse.json(
      { error: viewerSkillsResult.error.message || "Failed to fetch current user skills" },
      { status: 500 }
    );
  }
  if (profileEventsResult.error) {
    return NextResponse.json(
      { error: profileEventsResult.error.message || "Failed to fetch profile events" },
      { status: 500 }
    );
  }
  if (viewerEventsResult.error) {
    return NextResponse.json(
      { error: viewerEventsResult.error.message || "Failed to fetch current user events" },
      { status: 500 }
    );
  }

  const skillsByUser = new Map<string, Set<string>>();
  for (const row of (profileSkillsResult.data || []) as ProfileSkillRow[]) {
    const skillSlug = resolveSkillSlug(row.name);
    if (!skillSlug) continue;
    const existing = skillsByUser.get(row.user_id) || new Set<string>();
    existing.add(skillSlug);
    skillsByUser.set(row.user_id, existing);
  }

  const experienceByUser = new Map<string, number>();
  for (const row of (profileExperienceResult.data || []) as { user_id: string }[]) {
    experienceByUser.set(row.user_id, (experienceByUser.get(row.user_id) || 0) + 1);
  }

  const interestsByUser = new Map<string, InterestRow[]>();
  for (const row of (profileInterestsResult.data || []) as ProfileInterestJoinRow[]) {
    const interest = toSingle(row.interest);
    if (!interest) continue;
    const list = interestsByUser.get(row.user_id) || [];
    list.push(interest);
    interestsByUser.set(row.user_id, list);
  }

  const eventIdsByUser = new Map<string, Set<string>>();
  for (const row of (profileEventsResult.data || []) as EventMemberRow[]) {
    const existing = eventIdsByUser.get(row.user_id) || new Set<string>();
    existing.add(row.event_id);
    eventIdsByUser.set(row.user_id, existing);
  }

  const viewerRole = (viewerProfileResult.data as { role?: string | null } | null)?.role || null;
  const viewerInterestSlugs = new Set(
    ((viewerInterestsResult.data || []) as Array<{ interest: { slug: string } | { slug: string }[] | null }>)
      .map((row) => toSingle(row.interest)?.slug)
      .filter((slug: string | undefined): slug is string => Boolean(slug))
  );
  const viewerSkillSet = new Set(
    ((viewerSkillsResult.data || []) as Array<{ name: string | null }>)
      .map((row) => resolveSkillSlug(row.name))
      .filter((slug): slug is string => Boolean(slug))
  );
  const viewerEventIds = new Set(
    ((viewerEventsResult.data || []) as Array<{ event_id: string }>).map((row) => row.event_id)
  );

  const enrichedUsers: UserWithMatch[] = users.map((user) => {
    const interests = interestsByUser.get(user.id) || [];
    const interestSlugSet = new Set(interests.map((interest) => interest.slug));
    const skillSet = skillsByUser.get(user.id) || new Set<string>();
    const userEventIds = eventIdsByUser.get(user.id) || new Set<string>();
    const countryCode = typeof user.country_code === "string" ? user.country_code.toUpperCase() : null;
    const aboutText =
      (typeof user.about === "string" ? user.about : null) ||
      (typeof user.bio === "string" ? user.bio : null);

    const interestOverlapCount = bestMatches ? countSetOverlap(viewerInterestSlugs, interestSlugSet) : 0;
    const skillOverlapCount = bestMatches ? countSetOverlap(viewerSkillSet, skillSet) : 0;
    const sharedEventsCount = bestMatches ? countSetOverlap(viewerEventIds, userEventIds) : 0;

    const matchScore = bestMatches
      ? computeBestMatchScore({
          hasRoleMatch: Boolean(viewerRole && user.role && viewerRole === user.role),
          interestOverlapCount,
          skillOverlapCount,
          sharedEventsCount,
        })
      : 0;
    const hasCompleteProfile = shouldEnrichProfiles
      ? isCompleteProfile({
          about: aboutText,
          countryCode,
          role: user.role,
          skillCount: skillSet.size,
          interestCount: interests.length,
          experienceCount: experienceByUser.get(user.id) || 0,
        })
      : false;

    return {
      ...user,
      country_code: countryCode,
      is_complete_profile: hasCompleteProfile,
      match_score: matchScore,
      interest_overlap_count: interestOverlapCount,
      skill_overlap_count: skillOverlapCount,
      shared_events_count: sharedEventsCount,
    };
  });

  const filteredUsers = enrichedUsers.filter((user) => {
    if (completeProfilesOnly && !user.is_complete_profile) {
      return false;
    }
    if (bestMatches && user.match_score <= 0) {
      return false;
    }
    return true;
  });

  const sortedUsers = filteredUsers.sort((a, b) => {
    if (bestMatches && b.match_score !== a.match_score) {
      return b.match_score - a.match_score;
    }
    return toTimestamp(b.created_at) - toTimestamp(a.created_at);
  });

  const limit = parseBoundedInt(searchParams.get("limit"), 200, 1, 200);
  const offset = parseBoundedInt(searchParams.get("offset"), 0, 0, 10_000);
  const pagedUsers = sortedUsers.slice(offset, offset + limit);

  const pagedUserIds = pagedUsers.map((user) => user.id);
  let activeSubscriptions: { user_id: string }[] = [];
  if (pagedUserIds.length > 0) {
    const { data, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("user_id")
      .in("user_id", pagedUserIds)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString());

    if (subscriptionsError) {
      console.error("Error fetching active subscriptions:", subscriptionsError);
    } else {
      activeSubscriptions = data || [];
    }
  }

  const vipUserIds = new Set<string>();
  for (const sub of activeSubscriptions) {
    vipUserIds.add(sub.user_id);
  }

  const usersWithTier = pagedUsers.map((user) => ({
    ...user,
    subscription_tier: vipUserIds.has(user.id) ? "vip" : user.subscription_tier || "free",
  }));

  return NextResponse.json({ users: usersWithTier }, { status: 200 });
}
