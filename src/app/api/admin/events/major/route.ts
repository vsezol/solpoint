import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type EventRow = {
  id: string;
  name: string | null;
  slug: string | null;
  image_url: string | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  attendees_count: number | null;
  visibility: "public" | "vip_only" | null;
  is_major: boolean | null;
};

type VisibilityFilter = "all" | "public" | "vip_only";
type PeriodFilter = "upcoming" | "all";
type SortDirection = "asc" | "desc";

const EVENT_SELECT =
  "id, name, slug, image_url, city, country, start_date, end_date, attendees_count, visibility, is_major";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }

  return null;
}

function parsePositiveInteger(raw: string | null, fallback: number) {
  if (raw == null) return fallback;
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseSort(raw: string | null): SortDirection | null {
  if (!raw) return "asc";
  if (raw === "asc" || raw === "start_date_asc") return "asc";
  if (raw === "desc" || raw === "start_date_desc") return "desc";
  return null;
}

function escapeForILike(value: string) {
  return value.replace(/[%_]/g, "\\$&");
}

function sanitizeSearchTerm(value: string) {
  return value.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const authError = await requireAdmin(supabase);
  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const visibilityRaw = searchParams.get("visibility");
  const periodRaw = searchParams.get("period");
  const sortRaw = searchParams.get("sort");
  const pageRaw = searchParams.get("page");
  const limitRaw = searchParams.get("limit");

  const visibility: VisibilityFilter =
    visibilityRaw == null || visibilityRaw === ""
      ? "all"
      : (visibilityRaw as VisibilityFilter);
  const period: PeriodFilter =
    periodRaw == null || periodRaw === "" ? "upcoming" : (periodRaw as PeriodFilter);
  const sort = parseSort(sortRaw);
  const page = parsePositiveInteger(pageRaw, 1);
  const limit = parsePositiveInteger(limitRaw, 50);

  if (!["all", "public", "vip_only"].includes(visibility)) {
    return NextResponse.json(
      { error: "visibility must be one of: all, public, vip_only" },
      { status: 400 }
    );
  }

  if (!["upcoming", "all"].includes(period)) {
    return NextResponse.json(
      { error: "period must be one of: upcoming, all" },
      { status: 400 }
    );
  }

  if (!sort) {
    return NextResponse.json(
      { error: "sort must be one of: asc, desc, start_date_asc, start_date_desc" },
      { status: 400 }
    );
  }

  if (page == null) {
    return NextResponse.json({ error: "page must be a positive integer" }, { status: 400 });
  }

  if (limit == null || limit > 250) {
    return NextResponse.json(
      { error: "limit must be a positive integer <= 250" },
      { status: 400 }
    );
  }

  if (search.length > 200) {
    return NextResponse.json(
      { error: "search is too long (max 200 chars)" },
      { status: 400 }
    );
  }

  const rangeFrom = (page - 1) * limit;
  const rangeTo = rangeFrom + limit - 1;

  let query = supabase
    .from("events")
    .select(EVENT_SELECT, { count: "exact" });

  if (period === "upcoming") {
    query = query.gte("start_date", new Date().toISOString());
  }

  if (visibility !== "all") {
    query = query.eq("visibility", visibility);
  }

  const sanitizedSearch = sanitizeSearchTerm(search);

  if (sanitizedSearch) {
    const escaped = escapeForILike(sanitizedSearch);
    query = query.or(
      `name.ilike.%${escaped}%,slug.ilike.%${escaped}%,city.ilike.%${escaped}%,country.ilike.%${escaped}%`
    );
  }

  const { data, error, count } = await query
    .order("start_date", { ascending: sort === "asc" })
    .range(rangeFrom, rangeTo);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }

  const events = ((data || []) as EventRow[]).map((event) => ({
    ...event,
    visibility: event.visibility === "vip_only" ? "vip_only" : "public",
    is_major: event.is_major === true,
  }));
  const total = count ?? 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const majorEvents = events.filter((event) => event.is_major === true);
  const nonMajorEvents = events.filter((event) => event.is_major !== true);

  return NextResponse.json(
    {
      events,
      majorEvents,
      nonMajorEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: totalPages > 0 && page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        search,
        visibility,
        period,
        sort,
      },
    },
    { status: 200 }
  );
}
