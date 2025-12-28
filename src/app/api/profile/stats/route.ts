import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/profile/stats
 * Получить статистику пользователей
 * Query params: country_code?, city?
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const countryCode = searchParams.get("country_code");
    const city = searchParams.get("city");

    // Общее количество пользователей
    const { count: totalCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    let countryCount: number | null = null;
    let cityCount: number | null = null;

    // Количество пользователей в стране
    if (countryCode) {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("country_code", countryCode);
      countryCount = count;
    }

    // Количество пользователей в городе
    if (city) {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("city", city);
      cityCount = count;
    }

    return NextResponse.json({
      total: totalCount || 0,
      inCountry: countryCount,
      inCity: cityCount,
    });
  } catch (error: any) {
    console.error("Get profile stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get profile stats" },
      { status: 500 }
    );
  }
}

