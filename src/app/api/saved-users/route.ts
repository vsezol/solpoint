import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUUID } from "@/lib/utils";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rows, error } = await supabase
      .from("saved_users")
      .select("saved_user_id, created_at")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    const savedIds = (rows || []).map((r: any) => r.saved_user_id).filter(Boolean);
    if (savedIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, twitter_name, avatar_url, city, country, role, is_verified, subscription_tier")
      .in("id", savedIds);

    if (pErr) {
      throw pErr;
    }

    const byId = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));
    const items = savedIds.map((id) => byId.get(id)).filter(Boolean);

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load saved users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const targetUserId = body?.user_id as string | undefined;
    if (!targetUserId || !isUUID(targetUserId)) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }
    if (targetUserId === authUser.id) {
      return NextResponse.json({ error: "Cannot save yourself" }, { status: 400 });
    }

    // Toggle behavior: if already saved -> unsave, else save.
    const { data: existing, error: existingErr } = await supabase
      .from("saved_users")
      .select("id")
      .eq("user_id", authUser.id)
      .eq("saved_user_id", targetUserId)
      .maybeSingle();

    if (existingErr && existingErr.code !== "PGRST116") {
      throw existingErr;
    }

    if (existing?.id) {
      const { error: delErr } = await supabase
        .from("saved_users")
        .delete()
        .eq("id", existing.id);
      if (delErr) throw delErr;
      return NextResponse.json({ saved: false });
    }

    const { error: insErr } = await supabase.from("saved_users").insert({
      user_id: authUser.id,
      saved_user_id: targetUserId,
    });
    if (insErr) throw insErr;

    return NextResponse.json({ saved: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save user" },
      { status: 500 }
    );
  }
}

