import { createClient } from "@/lib/supabase/server";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";
import { NextResponse } from "next/server";
import { isEntityOwner } from "@/lib/utils/entity-ownership";

/**
 * POST /api/hubs/[id]/transfer-ownership
 * Передать владение хабом другому пользователю
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const supabase = await createClient();
  const { identifier } = await params;
  // Преобразуем identifier в ID
  
  const hubId = await getEntityIdByIdentifier("hub", identifier);
  if (!hubId) {
    return NextResponse.json(
      { error: "Hub not found" },
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
    const body = await request.json();
    const { new_owner_id } = body;

    if (!new_owner_id) {
      return NextResponse.json(
        { error: "new_owner_id is required" },
        { status: 400 }
      );
    }

    // Проверяем, является ли текущий пользователь владельцем
    const isOwner = await isEntityOwner("hub", hubId, authUser.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this hub" },
        { status: 403 }
      );
    }

    // Проверяем, что новый владелец существует
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", new_owner_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Обновляем owner_id
    const { data: updatedHub, error: updateError } = await supabase
      .from("hubs")
      .update({ owner_id: new_owner_id })
      .eq("id", hubId)
      .select()
      .single();

    if (updateError) {
      console.error("Error transferring ownership:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to transfer ownership" },
        { status: 500 }
      );
    }

    // Обновляем роль в hub_members
    await supabase
      .from("hub_members")
      .update({ role: "owner" })
      .eq("hub_id", hubId)
      .eq("user_id", new_owner_id);

    // Старый owner становится member (если он был в members)
    await supabase
      .from("hub_members")
      .update({ role: "member" })
      .eq("hub_id", hubId)
      .eq("user_id", authUser.id)
      .neq("role", "owner"); // Не трогаем если уже owner (на случай если он не был в members)

    return NextResponse.json({ hub: updatedHub, success: true });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

