import { createClient } from "@/lib/supabase/server";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const { identifier } = await params;
  // Преобразуем identifier в ID
  
  const projectId = await getEntityIdByIdentifier("project", identifier);
  if (!projectId) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", authUser.id)
    .single();

  if (profile?.subscription_tier !== "vip") {
    return NextResponse.json(
      { error: "PRO subscription required" },
      { status: 403 }
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: members, error } = await supabase
    .from("project_members")
    .select(`
      *,
      user:profiles(
        id,
        twitter_id,
        twitter_handle,
        twitter_name,
        avatar_url,
        bio,
        country,
        country_code,
        city,
        role,
        is_open_to_meet,
        subscription_tier,
        is_verified,
        wallet_address,
        socials,
        last_active_at,
        created_at,
        updated_at,
        countries!fk_profiles_country_code (
          name
        )
      )
    `)
    .eq("project_id", id)
    .order("joined_at", { ascending: false });

  if (error) {
    console.error("Error fetching project members:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch members" },
      { status: 500 }
    );
  }

  const items = (members || [])
    .filter((m) => m.user)
    .map((m) => {
      const user = m.user as any;
      return {
        id: user.id,
        avatar_url: user.avatar_url,
        name: user.twitter_name,
        twitter_handle: user.twitter_handle,
        isVip: user.subscription_tier === "vip",
        isVerified: user.is_verified,
      };
    });

  return NextResponse.json({ items }, { status: 200 });
}

