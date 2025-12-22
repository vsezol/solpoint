import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * PATCH /api/projects/[id]/members/[userId]/role
 * Изменить роль участника проекта (назначить модератора или понизить)
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

    // Проверяем, существует ли проект
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Проверяем, является ли текущий пользователь владельцем
    const { data: currentUserMember, error: memberError } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", id)
      .eq("user_id", authUser.id)
      .single();

    if (memberError || !currentUserMember || currentUserMember.role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Only owners can change member roles" },
        { status: 403 }
      );
    }

    // Нельзя изменить роль создателя
    if (userId === project.owner_id && role !== "owner") {
      return NextResponse.json(
        { error: "Cannot change owner's role" },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь является участником
    const { data: targetMember, error: targetError } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", id)
      .eq("user_id", userId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json(
        { error: "User is not a member of this project" },
        { status: 404 }
      );
    }

    // Нельзя назначить роль owner через этот эндпоинт (только создатель может быть owner)
    if (role === "owner" && userId !== project.owner_id) {
      return NextResponse.json(
        { error: "Cannot assign owner role" },
        { status: 400 }
      );
    }

    // Обновляем роль
    const { error: updateError } = await supabase
      .from("project_members")
      .update({ role })
      .eq("project_id", id)
      .eq("user_id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

