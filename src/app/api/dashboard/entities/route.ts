import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/dashboard/entities
 * Получить все сущности, которыми владеет текущий пользователь
 */
export async function GET() {
  const supabase = await createClient();

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entityFields = "id, name, slug, image_url, country, country_code, city, created_at";

    const [
      { data: events },
      { data: hubs },
      { data: projects },
      { data: communities },
    ] = await Promise.all([
      supabase
        .from("events")
        .select(`${entityFields}, start_date, end_date, attendees_count, owner_type, owner_id`)
        .or(`owner_type.eq.user,owner_id.eq.${authUser.id}`)
        .order("created_at", { ascending: false }),
      supabase
        .from("hubs")
        .select(`${entityFields}, members_count, owner_id`)
        .eq("owner_id", authUser.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select(`${entityFields}, members_count, owner_id`)
        .eq("owner_id", authUser.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("communities")
        .select(`${entityFields}, members_count, owner_id`)
        .eq("owner_id", authUser.id)
        .order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      events: events || [],
      hubs: hubs || [],
      projects: projects || [],
      communities: communities || [],
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

