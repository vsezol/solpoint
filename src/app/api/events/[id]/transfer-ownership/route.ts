import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isEventOwner, getEventOwnerUserId } from "@/lib/utils/entity-ownership";

/**
 * POST /api/events/[id]/transfer-ownership
 * Передать владение событием другому пользователю или сущности
 */
export async function POST(
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
    const body = await request.json();
    const { new_owner_type, new_owner_id } = body;

    // Валидация
    if (!new_owner_type || !new_owner_id) {
      return NextResponse.json(
        { error: "new_owner_type and new_owner_id are required" },
        { status: 400 }
      );
    }

    const validOwnerTypes = ["user", "hub", "community", "project", "workspace"];
    if (!validOwnerTypes.includes(new_owner_type)) {
      return NextResponse.json(
        { error: "Invalid owner_type. Must be: user, hub, community, project, or workspace" },
        { status: 400 }
      );
    }

    // Проверяем, является ли текущий пользователь владельцем
    const isOwner = await isEventOwner(id, authUser.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this event" },
        { status: 403 }
      );
    }

    // Если передаем сущности, проверяем что пользователь является владельцем этой сущности
    if (new_owner_type !== "user") {
      const tableName = new_owner_type === "workspace" ? "workspaces" : `${new_owner_type}s`;
      const { data: entity, error: entityError } = await supabase
        .from(tableName)
        .select("owner_id")
        .eq("id", new_owner_id)
        .single();

      if (entityError || !entity) {
        return NextResponse.json(
          { error: `${new_owner_type} not found` },
          { status: 404 }
        );
      }

      if (entity.owner_id !== authUser.id) {
        return NextResponse.json(
          { error: `You are not the owner of this ${new_owner_type}` },
          { status: 403 }
        );
      }
    } else {
      // Если передаем пользователю, проверяем что пользователь существует
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
    }

    // Обновляем owner
    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update({
        owner_type: new_owner_type,
        owner_id: new_owner_id,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error transferring ownership:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to transfer ownership" },
        { status: 500 }
      );
    }

    return NextResponse.json({ event: updatedEvent, success: true });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

