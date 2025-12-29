import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * DELETE /api/projects/[id]/members/[userId]
 * Удалить участника из проекта
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ identifier: string; userId: string }> }
) {
  const supabase = await createClient();
  const { identifier: id, userId } = await params;

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.owner_id !== authUser.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this project" },
        { status: 403 }
      );
    }

    if (userId === project.owner_id) {
      return NextResponse.json(
        { error: "Cannot remove the owner" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", id)
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

