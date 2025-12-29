import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * DELETE /api/hubs/[id]/members/[userId]
 * Удалить участника из хаба
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const supabase = await createClient();
  const { id, userId } = await params;

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

    // Нельзя удалить владельца
    if (userId === hub.owner_id) {
      return NextResponse.json(
        { error: "Cannot remove the owner" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("hub_members")
      .delete()
      .eq("hub_id", id)
      .eq("user_id", userId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || "Failed to remove member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

