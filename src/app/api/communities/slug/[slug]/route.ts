import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/communities/slug/[slug]
 * Получить комьюнити по slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient();
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json(
      { error: "Slug is required" },
      { status: 400 }
    );
  }

  const { data: community, error } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching community:", error);
    return NextResponse.json(
      { error: error.message || "Community not found" },
      { status: error.code === "PGRST116" ? 404 : 500 }
    );
  }

  return NextResponse.json({ community }, { status: 200 });
}

