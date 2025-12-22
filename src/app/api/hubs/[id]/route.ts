import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * PATCH /api/hubs/[id]
 * Обновить хаб
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
    const { data: hub, error: hubError } = await supabase
      .from("hubs")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (hubError || !hub) {
      return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    }

    if (hub.owner_id !== authUser.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this hub" },
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

    const { data: updatedHub, error: updateError } = await supabase
      .from("hubs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update hub" },
        { status: 500 }
      );
    }

    return NextResponse.json({ hub: updatedHub });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

