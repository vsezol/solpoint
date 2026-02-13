import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: "Forbidden: Admin required" }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

/** PATCH /api/admin/luma-config/[id] — update config */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authErr, user } = await requireAdmin(supabase);
  if (authErr) return authErr;

  let body: {
    schedule_type?: string;
    run_at_hour_utc?: number | null;
    run_at_minute?: number | null;
    cron_expression?: string | null;
    parse_guests?: boolean | null;
    max_events?: number | null;
    calendar_slug?: string | null;
    enabled?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("luma_workflow_config")
    .select("workflow_type")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }

  if (body.schedule_type === "daily" && body.run_at_hour_utc !== undefined && (body.run_at_hour_utc < 0 || body.run_at_hour_utc > 23)) {
    return NextResponse.json({ error: "run_at_hour_utc must be 0-23" }, { status: 400 });
  }
  if (body.schedule_type === "cron" && body.cron_expression !== undefined && !body.cron_expression?.trim()) {
    return NextResponse.json({ error: "cron_expression required when schedule_type is cron" }, { status: 400 });
  }

  const enabled = body.enabled;
  if (enabled === true) {
    await supabase
      .from("luma_workflow_config")
      .update({ enabled: false })
      .eq("workflow_type", existing.workflow_type)
      .neq("id", id);
  }

  const updates: Record<string, unknown> = {
    updated_by: user?.id ?? null,
  };
  if (body.schedule_type !== undefined) updates.schedule_type = body.schedule_type;
  if (body.run_at_hour_utc !== undefined) updates.run_at_hour_utc = body.run_at_hour_utc;
  if (body.run_at_minute !== undefined) updates.run_at_minute = body.run_at_minute;
  if (body.cron_expression !== undefined) updates.cron_expression = body.cron_expression?.trim() || null;
  if (body.parse_guests !== undefined) updates.parse_guests = body.parse_guests;
  if (body.max_events !== undefined) updates.max_events = body.max_events;
  if (body.calendar_slug !== undefined) updates.calendar_slug = body.calendar_slug?.trim() || null;
  if (body.enabled !== undefined) updates.enabled = body.enabled;

  const { data, error } = await supabase
    .from("luma_workflow_config")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ config: data }, { status: 200 });
}
