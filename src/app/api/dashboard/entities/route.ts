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
    // Получаем события, где пользователь владелец (прямо или через сущность)
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .or(`owner_type.eq.user,owner_id.eq.${authUser.id}`)
      .order("created_at", { ascending: false });

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
    }

    // Получаем хабы, где пользователь владелец
    const { data: hubs, error: hubsError } = await supabase
      .from("hubs")
      .select("*")
      .eq("owner_id", authUser.id)
      .order("created_at", { ascending: false });

    if (hubsError) {
      console.error("Error fetching hubs:", hubsError);
    }

    // Получаем проекты, где пользователь владелец
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", authUser.id)
      .order("created_at", { ascending: false });

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
    }

    // Получаем сообщества, где пользователь владелец
    const { data: communities, error: communitiesError } = await supabase
      .from("communities")
      .select("*")
      .eq("owner_id", authUser.id)
      .order("created_at", { ascending: false });

    if (communitiesError) {
      console.error("Error fetching communities:", communitiesError);
    }

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

