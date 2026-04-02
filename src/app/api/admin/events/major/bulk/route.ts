import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
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

  return null;
}

function normalizeIds(ids: unknown): string[] | null {
  if (!Array.isArray(ids) || ids.length === 0) {
    return null;
  }

  const normalized = ids
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  if (normalized.length !== ids.length) {
    return null;
  }

  return [...new Set(normalized)];
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const authError = await requireAdmin(supabase);
  if (authError) {
    return authError;
  }

  let body: { ids?: unknown; is_major?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = normalizeIds(body?.ids);
  if (!ids) {
    return NextResponse.json(
      { error: "ids must be a non-empty array of strings" },
      { status: 400 }
    );
  }

  if (typeof body?.is_major !== "boolean") {
    return NextResponse.json(
      { error: "is_major must be a boolean" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("events")
    .update({ is_major: body.is_major })
    .in("id", ids)
    .select("id, is_major");

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update events" },
      { status: 500 }
    );
  }

  const events =
    data?.map((event) => ({
      id: event.id,
      is_major: event.is_major === true,
    })) ?? [];

  return NextResponse.json(
    {
      updated: events.length,
      events,
    },
    { status: 200 }
  );
}
