import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isEventOwner, getEventOwnerUserId } from "@/lib/utils/entity-ownership";

/**
 * DELETE /api/events/[id]/members/[userId]
 * Удалить участника из события (только для владельца)
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
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const isOwner = await isEventOwner(id, authUser.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this event" },
        { status: 403 }
      );
    }

    // Получаем ID пользователя-владельца события
    const ownerUserId = await getEventOwnerUserId(id);
    
    // Нельзя удалить владельца
    if (ownerUserId && userId === ownerUserId) {
      return NextResponse.json(
        { error: "Cannot remove the owner" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("event_members")
      .delete()
      .eq("event_id", id)
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

