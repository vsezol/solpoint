import { createClient } from "@/lib/supabase/server";
import { isCronRequest } from "@/lib/cron-auth";
import { NextRequest, NextResponse } from "next/server";
import parser from "cron-parser";

type LumaWorkflowType = "full_pipeline" | "attendees_only";

interface WorkflowConfigRow {
  id: string;
  workflow_type: LumaWorkflowType;
  schedule_type: string;
  run_at_hour_utc: number | null;
  run_at_minute: number | null;
  cron_expression: string | null;
}

function isDue(config: WorkflowConfigRow, now: Date): boolean {
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  if (config.schedule_type === "daily") {
    const hour = config.run_at_hour_utc ?? 0;
    if (utcHour !== hour) return false;
    if (config.run_at_minute != null && config.run_at_minute !== utcMinute) {
      return false;
    }
    return true;
  }

  if (config.schedule_type === "cron" && config.cron_expression?.trim()) {
    try {
      const interval = parser.parseExpression(config.cron_expression.trim(), {
        currentDate: new Date(now.getTime() - 2 * 60 * 1000),
      });
      const next = interval.next().toDate();
      return next.getTime() <= now.getTime() + 60 * 1000;
    } catch {
      return false;
    }
  }

  return false;
}

function getBaseUrl(): string {
  const v = process.env.VERCEL_URL;
  if (v) return `https://${v}`;
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function run(request: NextRequest) {

  const supabase = await createClient();
  const { data: configs, error } = await supabase
    .from("luma_workflow_config")
    .select("id, workflow_type, schedule_type, run_at_hour_utc, run_at_minute, cron_expression")
    .eq("enabled", true);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load configs" },
      { status: 500 }
    );
  }

  const now = new Date();
  const due = (configs || []).filter((c) =>
    isDue(c as WorkflowConfigRow, now)
  );

  const secret = process.env.CRON_SECRET!;
  const base = getBaseUrl();
  const headers: HeadersInit = { "x-cron-secret": secret };
  const results: { workflow_type: string; status: number; ok: boolean }[] = [];

  for (const config of due) {
    const row = config as WorkflowConfigRow;
    if (row.workflow_type === "full_pipeline") {
      try {
        const r1 = await fetch(`${base}/api/admin/luma/transfer`, {
          method: "POST",
          headers,
        });
        results.push({
          workflow_type: "full_pipeline:transfer",
          status: r1.status,
          ok: r1.ok,
        });
        const r2 = await fetch(`${base}/api/admin/luma/enrich-locations`, {
          method: "POST",
          headers,
        });
        results.push({
          workflow_type: "full_pipeline:enrich-locations",
          status: r2.status,
          ok: r2.ok,
        });
        const r3 = await fetch(`${base}/api/admin/luma/save-images`, {
          method: "POST",
          headers,
        });
        results.push({
          workflow_type: "full_pipeline:save-images",
          status: r3.status,
          ok: r3.ok,
        });
      } catch (e) {
        results.push({
          workflow_type: "full_pipeline",
          status: 500,
          ok: false,
        });
      }
    } else if (row.workflow_type === "attendees_only") {
      // Placeholder: attendees-only pipeline not implemented yet
      results.push({
        workflow_type: "attendees_only",
        status: 200,
        ok: true,
      });
    }
  }

  return NextResponse.json({
    due: due.length,
    ran: results.length,
    results,
  });
}

export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run(request);
}

export async function POST(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run(request);
}
