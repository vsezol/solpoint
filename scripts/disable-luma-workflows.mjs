/**
 * Disable all rows in luma_workflow_config.
 * After running this, the /api/cron/luma-pipeline route will find no due
 * configs and become effectively a no-op. The Luma scraper UI, API routes,
 * tables and existing data remain untouched.
 *
 * To re-enable: UPDATE public.luma_workflow_config SET enabled = true;
 * (or toggle per-row from /admin/luma-scraper).
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key);

async function main() {
  console.log("Fetching current luma_workflow_config rows...");
  const { data: before, error: e1 } = await supabase
    .from("luma_workflow_config")
    .select("id, workflow_type, schedule_type, enabled, calendar_slug")
    .order("workflow_type");
  if (e1) {
    console.error("Lookup failed:", e1.message);
    process.exit(1);
  }
  console.log("Rows:", before?.length ?? 0);
  for (const r of before ?? []) {
    console.log(
      `  - ${r.workflow_type} | enabled=${r.enabled} | schedule=${r.schedule_type} | slug=${r.calendar_slug}`
    );
  }

  const wereEnabled = (before ?? []).filter((r) => r.enabled);
  if (wereEnabled.length === 0) {
    console.log("\nNothing to disable — all rows already enabled=false.");
    return;
  }

  console.log(`\nDisabling ${wereEnabled.length} row(s)...`);
  const { error: e2 } = await supabase
    .from("luma_workflow_config")
    .update({ enabled: false })
    .in(
      "id",
      wereEnabled.map((r) => r.id)
    );
  if (e2) {
    console.error("Update failed:", e2.message);
    process.exit(1);
  }

  const { data: after } = await supabase
    .from("luma_workflow_config")
    .select("id, workflow_type, enabled")
    .order("workflow_type");
  console.log("\nFinal state:");
  for (const r of after ?? []) {
    console.log(`  - ${r.workflow_type} | enabled=${r.enabled}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
