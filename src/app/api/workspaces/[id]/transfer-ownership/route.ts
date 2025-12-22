import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isEntityOwner } from "@/lib/utils/entity-ownership";

/**
 * POST /api/workspaces/[id]/transfer-ownership
 * Передать владение workspace другому пользователю
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
    const { new_owner_id } = body;

    if (!new_owner_id) {
      return NextResponse.json(
        { error: "new_owner_id is required" },
        { status: 400 }
      );
    }

    const isOwner = await isEntityOwner("workspace", id, authUser.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this workspace" },
        { status: 403 }
      );
    }

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

    const { data: updatedWorkspace, error: updateError } = await supabase
      .from("workspaces")
      .update({ owner_id: new_owner_id })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to transfer ownership" },
        { status: 500 }
      );
    }

    await supabase
      .from("workspace_members")
      .update({ role: "owner" })
      .eq("workspace_id", id)
      .eq("user_id", new_owner_id);

    await supabase
      .from("workspace_members")
      .update({ role: "member" })
      .eq("workspace_id", id)
      .eq("user_id", authUser.id)
      .neq("role", "owner");

    return NextResponse.json({ workspace: updatedWorkspace, success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

