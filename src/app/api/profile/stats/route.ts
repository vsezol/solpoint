import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";

const getProfileStats = unstable_cache(
  async (countryCode: string | null, city: string | null) => {
    const supabase = createServiceRoleClient();

    const queries: Promise<{ count: number | null }>[] = [
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true }) as any,
    ];

    if (countryCode) {
      queries.push(
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("country_code", countryCode) as any
      );
    }

    if (city) {
      queries.push(
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("city", city) as any
      );
    }

    const results = await Promise.all(queries);

    let idx = 0;
    const total = results[idx++]?.count || 0;
    const inCountry = countryCode ? (results[idx++]?.count ?? null) : null;
    const inCity = city ? (results[idx++]?.count ?? null) : null;

    return { total, inCountry, inCity };
  },
  ["profile-stats"],
  { revalidate: 30, tags: ["profile-stats"] }
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get("country_code");
    const city = searchParams.get("city");

    const stats = await getProfileStats(countryCode, city);
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get profile stats" },
      { status: 500 }
    );
  }
}
