import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/interests
 * Public dictionary endpoint for profile/forms/filters.
 */
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("interests")
    .select("id, slug, name")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load interests" },
      { status: 500 }
    );
  }

  return NextResponse.json({ items: data || [] }, { status: 200 });
}
