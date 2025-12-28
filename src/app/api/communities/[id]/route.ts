import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * PATCH /api/communities/[id]
 * Обновить сообщество
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    if (community.owner_id !== authUser.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this community" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, image_url, socials } = body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description || null;
    if (image_url !== undefined) updates.image_url = image_url || null;
    if (socials !== undefined) updates.socials = socials || {};

    const { data: updatedCommunity, error: updateError } = await supabase
      .from("communities")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update community" },
        { status: 500 }
      );
    }

    return NextResponse.json({ community: updatedCommunity });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

