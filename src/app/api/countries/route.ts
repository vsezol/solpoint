import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/countries
 * Получить список всех стран
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("countries")
      .select("code, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching countries:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch countries" },
        { status: 500 }
      );
    }

    return NextResponse.json({ countries: data || [] });
  } catch (error: any) {
    console.error("Get countries error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get countries" },
      { status: 500 }
    );
  }
}

