import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export type LumaWorkflowType = "full_pipeline" | "attendees_only";

export interface LumaWorkflowConfigRow {
  id: string;
  workflow_type: LumaWorkflowType;
  schedule_type: string;
  run_at_hour_utc: number | null;
  run_at_minute: number | null;
  cron_expression: string | null;
  parse_guests: boolean | null;
  max_events: number | null;
  calendar_slug: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

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

/** GET /api/admin/luma-config — list all configs */
export async function GET() {
  const supabase = await createClient();
  const { error: authErr } = await requireAdmin(supabase);
  if (authErr) return authErr;

  const { data, error } = await supabase
    .from("luma_workflow_config")
    .select("*")
    .order("workflow_type", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ configs: data ?? [] }, { status: 200 });
}

/** POST /api/admin/luma-config — create config. If enabled=true, disables other configs of same workflow_type. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { error: authErr, user } = await requireAdmin(supabase);
  if (authErr) return authErr;

  let body: {
    workflow_type: LumaWorkflowType;
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

  if (!body.workflow_type || !["full_pipeline", "attendees_only"].includes(body.workflow_type)) {
    return NextResponse.json({ error: "workflow_type required: full_pipeline | attendees_only" }, { status: 400 });
  }

  const scheduleType = body.schedule_type ?? "daily";
  if (scheduleType === "daily" && body.run_at_hour_utc == null) {
    return NextResponse.json({ error: "run_at_hour_utc required when schedule_type is daily" }, { status: 400 });
  }
  if (scheduleType === "cron" && !body.cron_expression?.trim()) {
    return NextResponse.json({ error: "cron_expression required when schedule_type is cron" }, { status: 400 });
  }

  const enabled = body.enabled ?? true;
  if (enabled) {
    await supabase
      .from("luma_workflow_config")
      .update({ enabled: false })
      .eq("workflow_type", body.workflow_type);
  }

  const row = {
    workflow_type: body.workflow_type,
    schedule_type: scheduleType,
    run_at_hour_utc: body.run_at_hour_utc ?? null,
    run_at_minute: body.run_at_minute ?? null,
    cron_expression: body.cron_expression?.trim() || null,
    parse_guests: body.parse_guests ?? null,
    max_events: body.max_events ?? null,
    calendar_slug: body.calendar_slug?.trim() || null,
    enabled,
    updated_by: user?.id ?? null,
  };

  const { data, error } = await supabase
    .from("luma_workflow_config")
    .insert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ config: data }, { status: 201 });
}
