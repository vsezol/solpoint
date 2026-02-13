import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isCronRequest } from "@/lib/cron-auth";
import { NextRequest, NextResponse } from "next/server";

const LIMIT_PER_RUN = 20;
const LUMA_CDN_HOSTS = ["images.lumacdn.com", "cdn.lu.ma"];

function isLumaImageUrl(url: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return LUMA_CDN_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

function extFromContentType(ct: string | null): string {
  if (!ct) return "jpg";
  const m = ct.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "jpg";
}

export async function POST(request: NextRequest) {
  const useCron = isCronRequest(request);
  const supabase = useCron ? createServiceRoleClient() : await createClient();
  let adminUserId: string | null = null;

  if (!useCron) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    adminUserId = user.id;

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
  }

  const { data: events, error: fetchErr } = await supabase
    .from("events")
    .select("id, image_url")
    .not("luma_event_id", "is", null)
    .not("image_url", "is", null)
    .limit(LIMIT_PER_RUN * 2);

  if (fetchErr) {
    return NextResponse.json(
      { error: fetchErr.message || "Failed to fetch events" },
      { status: 500 }
    );
  }

  const toProcess = (events || []).filter((e) => isLumaImageUrl(e.image_url)).slice(0, LIMIT_PER_RUN);
  let saved = 0;
  const errors: string[] = [];
  const pathPrefix = useCron ? "cron/import" : `${adminUserId}/import`;

  for (const ev of toProcess) {
    const imageUrl = ev.image_url!;
    try {
      const res = await fetch(imageUrl, {
        headers: { "User-Agent": "SolPoint/1.0 (admin image import)" },
      });
      if (!res.ok) {
        errors.push(`Event ${ev.id}: fetch ${res.status}`);
        continue;
      }
      const contentType = res.headers.get("content-type");
      const ext = extFromContentType(contentType);
      const buffer = await res.arrayBuffer();
      const path = `${pathPrefix}/${ev.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(path, buffer, {
          contentType: contentType || "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        errors.push(`Event ${ev.id}: ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("events")
        .update({ image_url: urlData.publicUrl })
        .eq("id", ev.id);

      if (updateError) {
        errors.push(`Event ${ev.id}: ${updateError.message}`);
        await supabase.storage.from("event-images").remove([path]);
        continue;
      }
      saved += 1;
    } catch (e) {
      errors.push(`Event ${ev.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json(
    {
      saved,
      failed: errors.length,
      total_processed: toProcess.length,
      errors: errors.slice(0, 10),
    },
    { status: 200 }
  );
}
