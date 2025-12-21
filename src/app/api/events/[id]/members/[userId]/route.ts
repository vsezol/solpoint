import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * DELETE /api/events/[id]/members/[userId]
 * Удалить участника из события (только для организатора)
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
      .select("organizer_id")
      .eq("id", id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.organizer_id !== authUser.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the organizer of this event" },
        { status: 403 }
      );
    }

    // Нельзя удалить организатора
    if (userId === event.organizer_id) {
      return NextResponse.json(
        { error: "Cannot remove the organizer" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("event_attendees")
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

