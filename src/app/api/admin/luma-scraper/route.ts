import { createClient } from "@/lib/supabase/server";
import { ApifyClient } from "apify-client";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ACTORS = {
  lukas: "lukas_bekr/apify-luma-scraper",
  lexis: "lexis-solutions/lu-ma-scraper",
} as const;

export type ScraperId = keyof typeof ACTORS | "own";

export type LukasScraperInput = {
  searchKeywords?: string[];
  calendarSlugs?: string[];
  categorySlugs?: string[];
  locationSlugs?: string[];
  fetchAttendees?: boolean;
  attendeeLimit?: number;
  maxEventsTotal?: number;
  discoveryLimitPerMode?: number;
};

export type LexisScraperInput = {
  query?: string;
  maxItems?: number;
  location?: string;
};

export type LumaScraperInput = (
  | ({ scraper: "lukas" } & LukasScraperInput)
  | ({ scraper: "lexis" } & LexisScraperInput)
) & { scraper: ScraperId };

function ensureDataDir(): string {
  const dir = path.join(process.cwd(), "data", "luma-scraper-results");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveResultsLocally(scraperId: ScraperId, items: unknown[]): string {
  const dir = ensureDataDir();
  const filename = `luma-${scraperId}-${Date.now()}.json`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(
    filepath,
    JSON.stringify({ scraper: scraperId, items, savedAt: new Date().toISOString() }, null, 2),
    "utf-8"
  );
  return filepath;
}

/**
 * POST /api/admin/luma-scraper
 * Run Apify Luma scraper with given params, save result to local JSON, return items.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

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

  let body: { scraper?: ScraperId } & Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const scraperId: ScraperId =
    body.scraper === "own" ? "own" : body.scraper === "lexis" ? "lexis" : "lukas";

  if (scraperId === "own") {
    const calendar = (body.calendarSlug as string) || (body.calendar as string) || "superteam";
    const maxEvents = typeof body.maxEvents === "number" ? body.maxEvents : 30;
    const parseGuests = body.parseGuests === true;
    const scriptPath = path.join(process.cwd(), "scripts", "luma-scraper", "run.mjs");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;
    try {
      const result = spawnSync(
        process.execPath,
        [scriptPath, calendar, String(maxEvents)],
        {
          cwd: process.cwd(),
          encoding: "utf-8",
          timeout: 5 * 60 * 1000,
          maxBuffer: 10 * 1024 * 1024,
          env: {
            ...process.env,
            LUMA_CALENDAR: calendar,
            LUMA_MAX_EVENTS: String(maxEvents),
            LUMA_PARSE_GUESTS: parseGuests ? "1" : "0",
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ?? "",
            SUPABASE_URL: supabaseUrl ?? "",
            SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ?? "",
          },
        }
      );
      const stdout = result.stdout?.trim() || "";
      const stderr = result.stderr?.trim() || "";
      if (stderr) {
        console.error("[luma-scraper logs]\n" + stderr);
      }
      if (result.status !== 0) {
        return NextResponse.json(
          { error: stderr || result.error?.message || "Scraper script failed" },
          { status: 500 }
        );
      }
      const lastLine = stdout.split("\n").filter((l) => l.trim()).pop() || "{}";
      const data = JSON.parse(lastLine) as { savedTo?: string; count?: number; items?: unknown[] };
      return NextResponse.json({
        scraper: "own",
        runId: null,
        status: "SUCCEEDED",
        count: data.count ?? (data.items?.length ?? 0),
        savedTo: data.savedTo ?? "",
        items: data.items ?? [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Own scraper failed";
      console.error("Luma own scraper error:", err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const token = process.env.APIFY_API_KEY;
  if (!token) {
    return NextResponse.json(
      { error: "APIFY_API_KEY is not set in environment" },
      { status: 500 }
    );
  }

  const actorId = ACTORS[scraperId];
  const input =
    scraperId === "lexis"
      ? {
          query: (body.query as string) || "Solana",
          maxItems: typeof body.maxItems === "number" ? body.maxItems : 50,
          ...(typeof body.location === "string" && body.location.trim() ? { location: body.location.trim() } : {}),
        }
      : {
          searchKeywords: (body.searchKeywords as string[] | undefined) ?? ["Solana"],
          calendarSlugs: (body.calendarSlugs as string[] | undefined) ?? ["superteam"],
          categorySlugs: (body.categorySlugs as string[] | undefined) ?? undefined,
          locationSlugs: (body.locationSlugs as string[] | undefined) ?? undefined,
          fetchAttendees: body.fetchAttendees !== false,
          attendeeLimit: typeof body.attendeeLimit === "number" ? body.attendeeLimit : 50,
          maxEventsTotal: typeof body.maxEventsTotal === "number" ? body.maxEventsTotal : 30,
          discoveryLimitPerMode: typeof body.discoveryLimitPerMode === "number" ? body.discoveryLimitPerMode : 50,
        };

  try {
    const client = new ApifyClient({ token });
    const run = await client.actor(actorId).call(input);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const filepath = saveResultsLocally(scraperId, items as unknown[]);

    return NextResponse.json({
      scraper: scraperId,
      runId: run.id,
      status: run.status,
      count: items.length,
      savedTo: filepath,
      items,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scraper failed";
    console.error("Luma scraper error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
