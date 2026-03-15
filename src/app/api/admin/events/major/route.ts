import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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

  const { data: events, error } = await supabase
    .from("events")
    .select("id, name, slug, image_url, city, country, start_date, end_date, attendees_count, visibility, is_major")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(250);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }

  return NextResponse.json({ events: events || [] }, { status: 200 });
}
