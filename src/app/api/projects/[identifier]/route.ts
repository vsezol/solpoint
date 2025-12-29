import { createClient } from "@/lib/supabase/server";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";
import { NextResponse } from "next/server";

/**
 * PATCH /api/projects/[id]
 * Обновить проект
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const supabase = await createClient();
  const { identifier } = await params;
  // Преобразуем identifier в ID
  
  const projectId = await getEntityIdByIdentifier("project", identifier);
  if (!projectId) {
    return NextResponse.json(
      { error: "Project not found" },
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

    const body = await request.json();
    const { name, description, image_url, socials, country, country_code, city, latitude, longitude } = body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description || null;
    if (image_url !== undefined) updates.image_url = image_url || null;
    if (socials !== undefined) updates.socials = socials || {};
    
    // Location fields
    if (country !== undefined) updates.country = country || null;
    if (country_code !== undefined) updates.country_code = country_code || null;
    if (city !== undefined) updates.city = city || null;
    if (latitude !== undefined) updates.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updates.longitude = longitude ? parseFloat(longitude) : null;

    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ project: updatedProject });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

