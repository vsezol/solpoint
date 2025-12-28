import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/users/created-entities
 * Получить список хабов, проектов и комьюнити, в которых текущий пользователь является создателем
 * Используется для создания ивентов от имени этих сущностей
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Проверка авторизации
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Получаем хабы, где пользователь является владельцем
    const { data: hubs, error: hubsError } = await supabase
      .from("hubs")
      .select("id, name, slug")
      .eq("owner_id", user.id)
      .order("name");

    if (hubsError) {
      console.error("Error fetching user hubs:", hubsError);
    }

    // Получаем проекты, где пользователь является владельцем
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, slug")
      .eq("owner_id", user.id)
      .order("name");

    if (projectsError) {
      console.error("Error fetching user projects:", projectsError);
    }

    // Получаем комьюнити, где пользователь является владельцем
    const { data: communities, error: communitiesError } = await supabase
      .from("communities")
      .select("id, name, slug")
      .eq("owner_id", user.id)
      .order("name");

    if (communitiesError) {
      console.error("Error fetching user communities:", communitiesError);
    }

    // Получаем workspaces, где пользователь является владельцем
    const { data: workspaces, error: workspacesError } = await supabase
      .from("workspaces")
      .select("id, name, slug")
      .eq("owner_id", user.id)
      .order("name");

    if (workspacesError) {
      console.error("Error fetching user workspaces:", workspacesError);
    }

    return NextResponse.json(
      {
        hubs: hubs || [],
        projects: projects || [],
        communities: communities || [],
        workspaces: workspaces || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching created entities:", error);
    return NextResponse.json(
      { error: "Failed to fetch created entities" },
      { status: 500 }
    );
  }
}

