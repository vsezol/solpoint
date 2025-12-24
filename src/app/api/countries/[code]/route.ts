import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/countries/[code]
 * Получить страну по коду
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length !== 2) {
      return NextResponse.json(
        { error: "Invalid country code. Must be 2 characters." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("countries")
      .select("code, name")
      .eq("code", code.toUpperCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return NextResponse.json(
          { error: "Country not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching country:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch country" },
        { status: 500 }
      );
    }

    return NextResponse.json({ country: data });
  } catch (error: any) {
    console.error("Get country error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get country" },
      { status: 500 }
    );
  }
}

