import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * PATCH /api/events/[id]/members/[userId]/role
 * Изменить роль участника события (назначить модератора или понизить)
 */
export async function PATCH(
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
    const { role } = await request.json();

    if (!role || !["member", "moderator", "owner"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'member', 'moderator', or 'owner'" },
        { status: 400 }
      );
    }

    // Проверяем, существует ли событие
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("organizer_id")
      .eq("id", id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Проверяем, является ли текущий пользователь организатором (owner)
    if (event.organizer_id !== authUser.id) {
      return NextResponse.json(
        { error: "Forbidden: Only organizers can change member roles" },
        { status: 403 }
      );
    }

    // Нельзя изменить роль организатора
    if (userId === event.organizer_id && role !== "owner") {
      return NextResponse.json(
        { error: "Cannot change organizer's role" },
        { status: 400 }
      );
    }

    // Для событий роли хранятся в отдельной таблице event_roles
    if (role === "owner") {
      // Нельзя назначить роль owner через этот эндпоинт (только организатор может быть owner)
      return NextResponse.json(
        { error: "Cannot assign owner role" },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь является участником события
    const { data: attendee, error: attendeeError } = await supabase
      .from("event_attendees")
      .select("user_id")
      .eq("event_id", id)
      .eq("user_id", userId)
      .single();

    if (attendeeError || !attendee) {
      return NextResponse.json(
        { error: "User is not an attendee of this event" },
        { status: 404 }
      );
    }

    // Если роль moderator, добавляем в event_roles
    // Если роль member, удаляем из event_roles (если есть)
    if (role === "moderator") {
      const { error: insertError } = await supabase
        .from("event_roles")
        .upsert(
          {
            event_id: id,
            user_id: userId,
            role: "moderator",
          },
          {
            onConflict: "event_id,user_id",
          }
        );

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message || "Failed to assign moderator role" },
          { status: 500 }
        );
      }
    } else if (role === "member") {
      const { error: deleteError } = await supabase
        .from("event_roles")
        .delete()
        .eq("event_id", id)
        .eq("user_id", userId);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message || "Failed to remove moderator role" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

