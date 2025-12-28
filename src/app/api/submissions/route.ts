import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/submissions
 * Получить заявки текущего пользователя
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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const entityType = searchParams.get("entity_type");

  let query = supabase
    .from("entity_submissions")
    .select(`
      *,
      submitter:profiles!entity_submissions_submitter_id_fkey(id, twitter_handle, twitter_name, avatar_url)
    `)
    .eq("submitter_id", user.id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data: submissions, error } = await query;

  if (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch submissions" },
      { status: 500 }
    );
  }

  return NextResponse.json({ submissions: submissions || [] }, { status: 200 });
}

/**
 * POST /api/submissions
 * Создать новую заявку на создание сущности
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { entity_type, entity_data, contacts } = body;

    // Валидация обязательных полей
    if (!entity_type || !entity_data) {
      return NextResponse.json(
        { error: "Missing required fields: entity_type, entity_data" },
        { status: 400 }
      );
    }

    // Проверяем, является ли пользователь админом
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    // Если админ, создаем сущность сразу (без заявки)
    if (profile?.is_admin) {
      // TODO: Создать сущность напрямую в соответствующей таблице
      // Это будет реализовано позже, когда обновим формы создания
      return NextResponse.json(
        { error: "Admins should create entities directly (not implemented yet)" },
        { status: 400 }
      );
    }

    // Валидация контактов для не-админов
    if (!contacts || (!contacts.email && !contacts.telegram)) {
      return NextResponse.json(
        { error: "At least one contact method (email or telegram) is required" },
        { status: 400 }
      );
    }

    // Создаем заявку
    const { data: submission, error: createError } = await supabase
      .from("entity_submissions")
      .insert({
        entity_type,
        entity_data,
        contacts: contacts || {},
        submitter_id: user.id,
        status: "pending",
      })
      .select(`
        *,
        submitter:profiles!entity_submissions_submitter_id_fkey(id, twitter_handle, twitter_name, avatar_url)
      `)
      .single();

    if (createError) {
      console.error("Error creating submission:", createError);
      return NextResponse.json(
        { error: createError.message || "Failed to create submission" },
        { status: 500 }
      );
    }

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

