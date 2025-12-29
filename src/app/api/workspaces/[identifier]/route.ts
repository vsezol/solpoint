import { createClient } from "@/lib/supabase/server";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";
import { NextResponse } from "next/server";
import { isEntityOwner } from "@/lib/utils/entity-ownership";

/**
 * GET /api/workspaces/[id]
 * Получить workspace по ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const supabase = await createClient();
  const { identifier } = await params;
  // Преобразуем identifier в ID
  
  const workspaceId = await getEntityIdByIdentifier("workspace", identifier);
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace not found" },
      { status: 404 }
    );
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    console.error("Error fetching workspace:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch workspace" },
      { status: 500 }
    );
  }

  return NextResponse.json({ workspace }, { status: 200 });
}

/**
 * PATCH /api/workspaces/[id]
 * Обновить workspace
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const supabase = await createClient();
  const { identifier } = await params;
  // Преобразуем identifier в ID
  
  const workspaceId = await getEntityIdByIdentifier("workspace", identifier);
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace not found" },
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
    // Проверяем, является ли пользователь владельцем или модератором
    const isOwner = await isEntityOwner("workspace", workspaceId, authUser.id);
    if (!isOwner) {
      // Проверяем, является ли пользователь модератором
      const { data: member } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", authUser.id)
        .single();

      if (!member || !["owner", "moderator"].includes(member.role)) {
        return NextResponse.json(
          { error: "Forbidden: You are not the owner or moderator of this workspace" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.description !== undefined) {
      updates.description = body.description;
    }

    // Обновление локации
    if (body.country !== undefined) {
      updates.country = body.country;
    }
    if (body.country_code !== undefined) {
      updates.country_code = body.country_code ? body.country_code.toUpperCase() : null;
    }
    if (body.city !== undefined) {
      updates.city = body.city;
    }
    if (body.address !== undefined) {
      updates.address = body.address;
    }
    if (body.latitude !== undefined) {
      updates.latitude = body.latitude;
    }
    if (body.longitude !== undefined) {
      updates.longitude = body.longitude;
    }

    if (body.name !== undefined) {
      updates.name = body.name;
    }
    if (body.image_url !== undefined) {
      updates.image_url = body.image_url;
    }
    if (body.socials !== undefined) {
      updates.socials = body.socials;
    }

    const { data: updatedWorkspace, error: updateError } = await supabase
      .from("workspaces")
      .update(updates)
      .eq("id", workspaceId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating workspace:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update workspace" },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspace: updatedWorkspace }, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

