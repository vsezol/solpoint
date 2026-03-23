import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidCountryCode, normalizeCountryCode } from "@/lib/countries";
import { INTEREST_SLUGS, USER_ROLE_VALUES } from "@/lib/profile-taxonomy";

const MAX_ABOUT = 4000;
const MAX_SKILLS = 50;
const MAX_SKILL_NAME = 120;
const MAX_EXPERIENCE_ITEMS = 25;
const MAX_TITLE = 300;
const MAX_COMPANY = 200;
const MAX_DATE_STR = 32;
const MAX_EXP_DESC = 2000;

export interface ProfileDetailsSkillRow {
  id: string;
  name: string;
  sort_order: number;
}

export interface ProfileDetailsExperienceRow {
  id: string;
  title: string;
  company: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  sort_order: number;
}

export interface ProfileDetailsInterestRow {
  id: string;
  slug: string;
  name: string;
}

function mapSkills(rows: ProfileDetailsSkillRow[]) {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sortOrder: r.sort_order,
  }));
}

function mapExperience(rows: ProfileDetailsExperienceRow[]) {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    company: r.company,
    startDate: r.start_date,
    endDate: r.end_date,
    description: r.description,
    sortOrder: r.sort_order,
  }));
}

function mapInterests(rows: ProfileDetailsInterestRow[]) {
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "user_id parameter is required" }, { status: 400 });
    }

    const [profileResult, skillsResult, expResult, interestsResult] = await Promise.all([
      supabase.from("profiles").select("about, bio, role, country, country_code, city").eq("id", userId).maybeSingle(),
      supabase
        .from("profile_skills")
        .select("id, name, sort_order")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("profile_experience")
        .select("id, title, company, start_date, end_date, description, sort_order")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("profile_interests")
        .select("interest:interests(id, slug, name)")
        .eq("user_id", userId),
    ]);

    if (profileResult.error) {
      throw profileResult.error;
    }
    if (skillsResult.error) {
      throw skillsResult.error;
    }
    if (expResult.error) {
      throw expResult.error;
    }
    if (interestsResult.error) {
      throw interestsResult.error;
    }

    const profile = profileResult.data;
    const about =
      (profile?.about as string | null | undefined) ??
      (profile?.bio as string | null | undefined) ??
      null;
    const interestsRows = (interestsResult.data || [])
      .map((row: { interest: ProfileDetailsInterestRow | ProfileDetailsInterestRow[] | null }) =>
        Array.isArray(row.interest) ? row.interest[0] : row.interest
      )
      .filter((row: ProfileDetailsInterestRow | null): row is ProfileDetailsInterestRow => Boolean(row));
    const interests = mapInterests(interestsRows);

    return NextResponse.json({
      about,
      skills: mapSkills((skillsResult.data || []) as ProfileDetailsSkillRow[]),
      experience: mapExperience((expResult.data || []) as ProfileDetailsExperienceRow[]),
      role: (profile?.role as string | null | undefined) ?? null,
      country: (profile?.country as string | null | undefined) ?? null,
      countryCode: (profile?.country_code as string | null | undefined) ?? null,
      city: (profile?.city as string | null | undefined) ?? null,
      interests,
      interestSlugs: interests.map((interest) => interest.slug),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load profile details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface IncomingSkill {
  name?: string;
}

interface IncomingExperience {
  title?: string;
  company?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
}

function normalizeSkillName(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.length > MAX_SKILL_NAME) return null;
  return t;
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { about, skills, experience, role, countryCode, interestSlugs } = body as {
      about?: string | null;
      skills?: IncomingSkill[];
      experience?: IncomingExperience[];
      role?: string | null;
      countryCode?: string | null;
      interestSlugs?: string[] | null;
    };

    if (about === undefined || skills === undefined || experience === undefined) {
      return NextResponse.json(
        { error: "about, skills, and experience are required (use null or [] for empty)" },
        { status: 400 }
      );
    }

    if (about !== null && typeof about !== "string") {
      return NextResponse.json({ error: "about must be a string or null" }, { status: 400 });
    }
    if (typeof about === "string" && about.length > MAX_ABOUT) {
      return NextResponse.json({ error: `about must be ${MAX_ABOUT} characters or less` }, { status: 400 });
    }

    let normalizedRole: string | null | undefined;
    if (role !== undefined) {
      if (role === null || role === "") {
        normalizedRole = null;
      } else if (typeof role !== "string" || !USER_ROLE_VALUES.includes(role as (typeof USER_ROLE_VALUES)[number])) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      } else {
        normalizedRole = role;
      }
    }

    let normalizedCountryCode: string | null | undefined;
    if (countryCode !== undefined) {
      if (countryCode === null || countryCode === "") {
        normalizedCountryCode = null;
      } else if (typeof countryCode !== "string") {
        return NextResponse.json({ error: "countryCode must be a string or null" }, { status: 400 });
      } else {
        const code = normalizeCountryCode(countryCode);
        if (!isValidCountryCode(code)) {
          return NextResponse.json({ error: "countryCode must be a valid ISO alpha-2 code" }, { status: 400 });
        }
        normalizedCountryCode = code;
      }
    }

    let normalizedInterestSlugs: string[] | undefined;
    if (interestSlugs !== undefined && interestSlugs !== null) {
      if (!Array.isArray(interestSlugs)) {
        return NextResponse.json({ error: "interestSlugs must be an array of strings" }, { status: 400 });
      }
      const deduped = Array.from(
        new Set(
          interestSlugs
            .map((slug) => (typeof slug === "string" ? slug.trim().toLowerCase() : ""))
            .filter(Boolean)
        )
      );
      if (deduped.some((slug) => !INTEREST_SLUGS.has(slug))) {
        return NextResponse.json({ error: "Invalid interest slug provided" }, { status: 400 });
      }
      normalizedInterestSlugs = deduped;
    } else if (interestSlugs === null) {
      normalizedInterestSlugs = [];
    }

    if (!Array.isArray(skills)) {
      return NextResponse.json({ error: "skills must be an array" }, { status: 400 });
    }
    if (!Array.isArray(experience)) {
      return NextResponse.json({ error: "experience must be an array" }, { status: 400 });
    }

    if (skills.length > MAX_SKILLS) {
      return NextResponse.json({ error: `At most ${MAX_SKILLS} skills allowed` }, { status: 400 });
    }
    if (experience.length > MAX_EXPERIENCE_ITEMS) {
      return NextResponse.json(
        { error: `At most ${MAX_EXPERIENCE_ITEMS} experience entries allowed` },
        { status: 400 }
      );
    }

    const normalizedSkills: { name: string; sort_order: number }[] = [];
    {
      for (let i = 0; i < skills.length; i++) {
        const s = skills[i];
        if (!s || typeof s !== "object" || typeof s.name !== "string") {
          return NextResponse.json({ error: "Each skill must have a name string" }, { status: 400 });
        }
        const name = normalizeSkillName(s.name);
        if (!name) {
          return NextResponse.json({ error: "Skill names must be non-empty" }, { status: 400 });
        }
        normalizedSkills.push({ name, sort_order: i });
      }
    }

    const normalizedExp: {
      title: string;
      company: string | null;
      start_date: string | null;
      end_date: string | null;
      description: string | null;
      sort_order: number;
    }[] = [];

    {
      for (let i = 0; i < experience.length; i++) {
        const e = experience[i];
        if (!e || typeof e !== "object") {
          return NextResponse.json({ error: "Invalid experience entry" }, { status: 400 });
        }
        if (typeof e.title !== "string" || !e.title.trim()) {
          return NextResponse.json({ error: "Each experience entry needs a non-empty title" }, { status: 400 });
        }
        const title = e.title.trim();
        if (title.length > MAX_TITLE) {
          return NextResponse.json({ error: "Experience title too long" }, { status: 400 });
        }

        let company: string | null = null;
        if (e.company !== undefined && e.company !== null) {
          if (typeof e.company !== "string") {
            return NextResponse.json({ error: "company must be a string" }, { status: 400 });
          }
          const c = e.company.trim();
          if (c.length > MAX_COMPANY) {
            return NextResponse.json({ error: "company too long" }, { status: 400 });
          }
          company = c || null;
        }

        const startDate =
          e.startDate === undefined || e.startDate === null
            ? null
            : typeof e.startDate === "string"
              ? e.startDate.trim() || null
              : null;
        const endDate =
          e.endDate === undefined || e.endDate === null
            ? null
            : typeof e.endDate === "string"
              ? e.endDate.trim() || null
              : null;

        if (startDate && startDate.length > MAX_DATE_STR) {
          return NextResponse.json({ error: "startDate too long" }, { status: 400 });
        }
        if (endDate && endDate.length > MAX_DATE_STR) {
          return NextResponse.json({ error: "endDate too long" }, { status: 400 });
        }

        let description: string | null = null;
        if (e.description !== undefined && e.description !== null) {
          if (typeof e.description !== "string") {
            return NextResponse.json({ error: "description must be a string" }, { status: 400 });
          }
          const d = e.description.trim();
          if (d.length > MAX_EXP_DESC) {
            return NextResponse.json({ error: "description too long" }, { status: 400 });
          }
          description = d || null;
        }

        normalizedExp.push({
          title,
          company,
          start_date: startDate,
          end_date: endDate,
          description,
          sort_order: i,
        });
      }
    }

    const profileUpdatePayload: {
      about: string | null;
      role?: string | null;
      country_code?: string | null;
      country?: string | null;
    } = {
      about: about === null || about === "" ? null : about,
    };

    if (normalizedRole !== undefined) {
      profileUpdatePayload.role = normalizedRole;
    }

    if (normalizedCountryCode !== undefined) {
      profileUpdatePayload.country_code = normalizedCountryCode;
      if (normalizedCountryCode === null) {
        profileUpdatePayload.country = null;
      } else {
        const { data: countryRow, error: countryLookupError } = await supabase
          .from("countries")
          .select("name")
          .eq("code", normalizedCountryCode)
          .maybeSingle();

        if (countryLookupError) {
          throw countryLookupError;
        }

        profileUpdatePayload.country = (countryRow?.name as string | undefined) || null;
      }
    }

    const { error: upErr } = await supabase
      .from("profiles")
      .update(profileUpdatePayload)
      .eq("id", authUser.id);

    if (upErr) {
      throw upErr;
    }

    const { error: delS } = await supabase.from("profile_skills").delete().eq("user_id", authUser.id);
    if (delS) {
      throw delS;
    }
    if (normalizedSkills.length > 0) {
      const { error: insS } = await supabase.from("profile_skills").insert(
        normalizedSkills.map((s) => ({
          user_id: authUser.id,
          name: s.name,
          sort_order: s.sort_order,
        }))
      );
      if (insS) {
        throw insS;
      }
    }

    const { error: delE } = await supabase.from("profile_experience").delete().eq("user_id", authUser.id);
    if (delE) {
      throw delE;
    }
    if (normalizedExp.length > 0) {
      const { error: insE } = await supabase.from("profile_experience").insert(
        normalizedExp.map((row) => ({
          user_id: authUser.id,
          title: row.title,
          company: row.company,
          start_date: row.start_date,
          end_date: row.end_date,
          description: row.description,
          sort_order: row.sort_order,
        }))
      );
      if (insE) {
        throw insE;
      }
    }

    if (normalizedInterestSlugs !== undefined) {
      const { error: delI } = await supabase.from("profile_interests").delete().eq("user_id", authUser.id);
      if (delI) {
        throw delI;
      }

      if (normalizedInterestSlugs.length > 0) {
        const { data: interestsRows, error: interestsLookupError } = await supabase
          .from("interests")
          .select("id, slug")
          .in("slug", normalizedInterestSlugs);

        if (interestsLookupError) {
          throw interestsLookupError;
        }

        const interestBySlug = new Map(
          (interestsRows || []).map((row: { id: string; slug: string }) => [row.slug, row.id])
        );
        const missing = normalizedInterestSlugs.filter((slug) => !interestBySlug.has(slug));
        if (missing.length > 0) {
          return NextResponse.json(
            { error: `Unknown interest slugs: ${missing.join(", ")}` },
            { status: 400 }
          );
        }

        const { error: insI } = await supabase.from("profile_interests").insert(
          normalizedInterestSlugs.map((slug) => ({
            user_id: authUser.id,
            interest_id: interestBySlug.get(slug)!,
          }))
        );
        if (insI) {
          throw insI;
        }
      }
    }

    const [profileResult, skillsResult, expResult, interestsResult] = await Promise.all([
      supabase.from("profiles").select("about, bio, role, country, country_code, city").eq("id", authUser.id).maybeSingle(),
      supabase
        .from("profile_skills")
        .select("id, name, sort_order")
        .eq("user_id", authUser.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("profile_experience")
        .select("id, title, company, start_date, end_date, description, sort_order")
        .eq("user_id", authUser.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("profile_interests")
        .select("interest:interests(id, slug, name)")
        .eq("user_id", authUser.id),
    ]);

    if (profileResult.error) {
      throw profileResult.error;
    }
    if (skillsResult.error) {
      throw skillsResult.error;
    }
    if (expResult.error) {
      throw expResult.error;
    }
    if (interestsResult.error) {
      throw interestsResult.error;
    }

    const profile = profileResult.data;
    const aboutOut =
      (profile?.about as string | null | undefined) ??
      (profile?.bio as string | null | undefined) ??
      null;
    const interestsRows = (interestsResult.data || [])
      .map((row: { interest: ProfileDetailsInterestRow | ProfileDetailsInterestRow[] | null }) =>
        Array.isArray(row.interest) ? row.interest[0] : row.interest
      )
      .filter((row: ProfileDetailsInterestRow | null): row is ProfileDetailsInterestRow => Boolean(row));
    const interests = mapInterests(interestsRows);

    return NextResponse.json({
      about: aboutOut,
      skills: mapSkills((skillsResult.data || []) as ProfileDetailsSkillRow[]),
      experience: mapExperience((expResult.data || []) as ProfileDetailsExperienceRow[]),
      role: (profile?.role as string | null | undefined) ?? null,
      country: (profile?.country as string | null | undefined) ?? null,
      countryCode: (profile?.country_code as string | null | undefined) ?? null,
      city: (profile?.city as string | null | undefined) ?? null,
      interests,
      interestSlugs: interests.map((interest) => interest.slug),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save profile details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
