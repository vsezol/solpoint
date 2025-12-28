import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/hubs/slug/[slug]
 * Получить хаб по slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient();
  const { slug } = await params;

  const { data: hub, error } = await supabase
    .from("hubs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !hub) {
    return NextResponse.json(
      { error: error?.message || "Hub not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ hub }, { status: 200 });
}



