import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProfileLite = {
  id: string;
  twitter_name: string;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  role: string | null;
  is_verified: boolean;
  subscription_tier: "free" | "vip";
};

function extractFriendIds(rows: Array<{ user_id: string; friend_id: string }> | null, ownerId: string): string[] {
  if (!rows || rows.length === 0) return [];
  const ids = new Set<string>();
  for (const r of rows) {
    if (r.user_id === ownerId) ids.add(r.friend_id);
    else if (r.friend_id === ownerId) ids.add(r.user_id);
  }
  return Array.from(ids);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewerId = authUser.id;

    const [{ data: viewerProfile }, { data: interestRows }, { data: skillRows }, mutualRowsResult] =
      await Promise.all([
        supabase.from("profiles").select("city").eq("id", viewerId).maybeSingle(),
        supabase.from("profile_interests").select("interest_id").eq("user_id", viewerId),
        supabase.from("profile_skills").select("name").eq("user_id", viewerId),
        supabase
          .from("mutual_friends")
          .select("user_id, friend_id")
          .or(`user_id.eq.${viewerId},friend_id.eq.${viewerId}`),
      ]);

    const viewerCity = (viewerProfile as any)?.city ?? null;
    const viewerInterestIds = new Set<string>((interestRows || []).map((r: any) => r.interest_id).filter(Boolean));
    const viewerSkillNames = new Set<string>((skillRows || []).map((r: any) => r.name).filter(Boolean));
    const viewerFriendIds = extractFriendIds((mutualRowsResult as any)?.data || null, viewerId);
    const viewerFriendSet = new Set(viewerFriendIds);

    const candidateReasons = new Map<string, { city: boolean; interests: number; skills: number; mutuals: number }>();
    const ensure = (id: string) => {
      const existing = candidateReasons.get(id);
      if (existing) return existing;
      const next = { city: false, interests: 0, skills: 0, mutuals: 0 };
      candidateReasons.set(id, next);
      return next;
    };

    // Same city
    if (viewerCity) {
      const { data: cityUsers } = await supabase
        .from("profiles")
        .select("id")
        .eq("city", viewerCity)
        .neq("id", viewerId)
        .limit(200);
      for (const u of (cityUsers || []) as any[]) {
        const id = u.id as string;
        if (!id) continue;
        if (viewerFriendSet.has(id)) continue;
        ensure(id).city = true;
      }
    }

    // Interests overlap (>3)
    if (viewerInterestIds.size > 0) {
      const ids = Array.from(viewerInterestIds).slice(0, 50);
      const { data: rows } = await supabase
        .from("profile_interests")
        .select("user_id, interest_id")
        .in("interest_id", ids)
        .limit(10_000);
      const byUser = new Map<string, Set<string>>();
      for (const r of (rows || []) as any[]) {
        const userId = r.user_id as string;
        const interestId = r.interest_id as string;
        if (!userId || !interestId) continue;
        if (userId === viewerId) continue;
        if (viewerFriendSet.has(userId)) continue;
        const set = byUser.get(userId) || new Set<string>();
        set.add(interestId);
        byUser.set(userId, set);
      }
      for (const [id, set] of byUser) {
        const count = set.size;
        if (count > 3) {
          ensure(id).interests = count;
        }
      }
    }

    // Skills overlap (>4)
    if (viewerSkillNames.size > 0) {
      const names = Array.from(viewerSkillNames).slice(0, 80);
      const { data: rows } = await supabase
        .from("profile_skills")
        .select("user_id, name")
        .in("name", names)
        .limit(10_000);
      const byUser = new Map<string, Set<string>>();
      for (const r of (rows || []) as any[]) {
        const userId = r.user_id as string;
        const name = r.name as string;
        if (!userId || !name) continue;
        if (userId === viewerId) continue;
        if (viewerFriendSet.has(userId)) continue;
        const set = byUser.get(userId) || new Set<string>();
        set.add(name);
        byUser.set(userId, set);
      }
      for (const [id, set] of byUser) {
        const count = set.size;
        if (count > 4) {
          ensure(id).skills = count;
        }
      }
    }

    // Mutual friends overlap (>3)
    if (viewerFriendIds.length > 0) {
      const friendIds = viewerFriendIds.slice(0, 200);
      const [q1, q2] = await Promise.all([
        supabase.from("mutual_friends").select("user_id, friend_id").in("user_id", friendIds).limit(10_000),
        supabase.from("mutual_friends").select("user_id, friend_id").in("friend_id", friendIds).limit(10_000),
      ]);
      const counts = new Map<string, Set<string>>();

      const addPair = (a: string, b: string) => {
        // a is a viewer friend; b is candidate friend with that viewer friend
        if (!a || !b) return;
        if (b === viewerId) return;
        if (viewerFriendSet.has(b)) return;
        const set = counts.get(b) || new Set<string>();
        set.add(a);
        counts.set(b, set);
      };

      for (const r of (q1.data || []) as any[]) {
        addPair(r.user_id as string, r.friend_id as string);
      }
      for (const r of (q2.data || []) as any[]) {
        addPair(r.friend_id as string, r.user_id as string);
      }

      for (const [candidateId, set] of counts) {
        const c = set.size;
        if (c > 3) {
          ensure(candidateId).mutuals = c;
        }
      }
    }

    // Build list of candidates that satisfy at least one rule
    const candidateIds = Array.from(candidateReasons.entries())
      .filter(([id, r]) => Boolean(id) && (r.city || r.interests > 3 || r.skills > 4 || r.mutuals > 3))
      .map(([id]) => id);

    if (candidateIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, twitter_name, avatar_url, city, country, role, is_verified, subscription_tier")
      .in("id", candidateIds.slice(0, 200));

    if (error) {
      throw error;
    }

    // Sort by strongest signal
    const scored = (profiles || []).map((p: any) => {
      const r = candidateReasons.get(p.id) || { city: false, interests: 0, skills: 0, mutuals: 0 };
      const score =
        (r.city ? 1 : 0) +
        Math.min(10, r.interests) * 2 +
        Math.min(10, r.skills) * 2 +
        Math.min(10, r.mutuals) * 3;
      return { p: p as ProfileLite, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return NextResponse.json({ items: scored.slice(0, 20).map((s) => s.p) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load suggestions" },
      { status: 500 }
    );
  }
}

