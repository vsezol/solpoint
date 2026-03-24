import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseBoundedInt } from "@/lib/security/request-guards";

/**
 * GET /api/admin/submissions
 * Получить все заявки для админа (с фильтрами)
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

  // Проверка прав админа
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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const entityType = searchParams.get("entity_type");
  const limit = parseBoundedInt(searchParams.get("limit"), 50, 1, 100);
  const offset = parseBoundedInt(searchParams.get("offset"), 0, 0, 10_000);

  let query = supabase
    .from("entity_submissions")
    .select(`
      *,
      submitter:profiles!entity_submissions_submitter_id_fkey(id, twitter_handle, twitter_name, avatar_url),
      reviewer:profiles!entity_submissions_reviewed_by_fkey(id, twitter_handle, twitter_name, avatar_url)
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

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

  // Получаем общее количество для пагинации
  let countQuery = supabase
    .from("entity_submissions")
    .select("*", { count: "exact", head: true });

  if (status) {
    countQuery = countQuery.eq("status", status);
  }

  if (entityType) {
    countQuery = countQuery.eq("entity_type", entityType);
  }

  const { count } = await countQuery;

  return NextResponse.json(
    {
      submissions: submissions || [],
      total: count || 0,
      limit,
      offset,
    },
    { status: 200 }
  );
}
