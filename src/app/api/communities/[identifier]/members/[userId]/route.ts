import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";

/**
 * DELETE /api/communities/[identifier]/members/[userId]
 * Удалить участника из сообщества (работает с ID или slug)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ identifier: string; userId: string }> }
) {
  const supabase = await createClient();
  const { identifier, userId } = await params;
  
  // Преобразуем identifier в ID
  const id = await getEntityIdByIdentifier("community", identifier);
  if (!id) {
    return NextResponse.json(
      { error: "Community not found" },
      { status: 404 }
    );
  }

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

    if (userId === community.owner_id) {
      return NextResponse.json(
        { error: "Cannot remove the owner" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("community_members")
      .delete()
      .eq("community_id", id)
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

