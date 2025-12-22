import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * PATCH /api/admin/submissions/[id]
 * Одобрить или отклонить заявку
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Проверка авторизации
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Проверка прав админа
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { action, rejection_reason, admin_notes } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Получаем заявку
    const { data: submission, error: fetchError } = await supabase
      .from("entity_submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (submission.status !== "pending") {
      return NextResponse.json(
        { error: "Submission is not pending" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Создаем сущность в соответствующей таблице
      let createdEntityId: string | null = null;

      try {
        switch (submission.entity_type) {
          case "event": {
            const { generateEventSlug, getUniqueEventSlug } = await import(
              "@/lib/utils/event-slug"
            );
            const entityData = submission.entity_data;
            const baseSlug = generateEventSlug(
              entityData.name,
              entityData.city,
              entityData.start_date
            );
            const slug = await getUniqueEventSlug(baseSlug, async (slug) => {
              const { data } = await supabase
                .from("events")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();
              return !!data;
            });

            const { data: event, error: eventError } = await supabase
              .from("events")
              .insert({
                name: entityData.name,
                description: entityData.description,
                image_url: entityData.image_url,
                slug,
                country: entityData.country,
                country_code: entityData.country_code,
                city: entityData.city,
                address: entityData.address,
                venue_name: entityData.venue_name,
                latitude: parseFloat(entityData.latitude),
                longitude: parseFloat(entityData.longitude),
                start_date: new Date(entityData.start_date).toISOString(),
                end_date: entityData.end_date
                  ? new Date(entityData.end_date).toISOString()
                  : null,
                timezone: entityData.timezone,
                event_type: entityData.event_type || "community",
                visibility: entityData.visibility || "public",
                is_paid: entityData.is_paid || false,
                price_sol: entityData.price_sol
                  ? parseFloat(entityData.price_sol)
                  : null,
                price_usd: entityData.price_usd
                  ? parseFloat(entityData.price_usd)
                  : null,
                max_attendees: entityData.max_attendees
                  ? parseInt(entityData.max_attendees, 10)
                  : null,
                registration_deadline: entityData.registration_deadline
                  ? new Date(entityData.registration_deadline).toISOString()
                  : null,
                is_online: entityData.is_online || false,
                socials: entityData.socials || {},
                contacts: entityData.contacts || {},
                owner_type: entityData.hub_id ? "hub" : entityData.community_id ? "community" : entityData.project_id ? "project" : entityData.workspace_id ? "workspace" : "user",
                owner_id: entityData.hub_id || entityData.community_id || entityData.project_id || entityData.workspace_id || submission.submitter_id,
                attendees_count: 0,
                capacity_remaining: entityData.max_attendees || null,
              })
              .select("id")
              .single();

            if (eventError) {
              throw new Error(`Failed to create event: ${eventError.message}`);
            }
            createdEntityId = event.id;
            break;
          }

          case "hub": {
            const { generateHubSlug, getUniqueHubSlug } = await import(
              "@/lib/utils/hub-slug"
            );
            const entityData = submission.entity_data;
            const baseSlug = generateHubSlug(entityData.name, entityData.city);
            const slug = await getUniqueHubSlug(baseSlug, async (slug) => {
              const { data } = await supabase
                .from("hubs")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();
              return !!data;
            });

            const { data: hub, error: hubError } = await supabase
              .from("hubs")
              .insert({
                name: entityData.name,
                description: entityData.description,
                image_url: entityData.image_url,
                slug,
                country: entityData.country,
                city: entityData.city,
                latitude: parseFloat(entityData.latitude),
                longitude: parseFloat(entityData.longitude),
                socials: entityData.socials || {},
                owner_id: submission.submitter_id,
                members_count: 0,
              })
              .select("id")
              .single();

            if (hubError) {
              throw new Error(`Failed to create hub: ${hubError.message}`);
            }
            createdEntityId = hub.id;
            break;
          }

          case "community": {
            const { generateHubSlug, getUniqueHubSlug } = await import(
              "@/lib/utils/hub-slug"
            );
            const entityData = submission.entity_data;
            const baseSlug = generateHubSlug(entityData.name, entityData.city);
            const slug = await getUniqueHubSlug(baseSlug, async (slug) => {
              const { data } = await supabase
                .from("communities")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();
              return !!data;
            });

            const { data: community, error: communityError } = await supabase
              .from("communities")
              .insert({
                name: entityData.name,
                description: entityData.description,
                image_url: entityData.image_url,
                slug,
                country: entityData.country,
                city: entityData.city,
                latitude: parseFloat(entityData.latitude),
                longitude: parseFloat(entityData.longitude),
                socials: entityData.socials || {},
                owner_id: submission.submitter_id,
                members_count: 0,
              })
              .select("id")
              .single();

            if (communityError) {
              throw new Error(
                `Failed to create community: ${communityError.message}`
              );
            }
            createdEntityId = community.id;
            break;
          }

          case "project": {
            const { generateHubSlug, getUniqueHubSlug } = await import(
              "@/lib/utils/hub-slug"
            );
            const entityData = submission.entity_data;
            const baseSlug = generateHubSlug(entityData.name, entityData.city);
            const slug = await getUniqueHubSlug(baseSlug, async (slug) => {
              const { data } = await supabase
                .from("projects")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();
              return !!data;
            });

            const { data: project, error: projectError } = await supabase
              .from("projects")
              .insert({
                name: entityData.name,
                description: entityData.description,
                image_url: entityData.image_url,
                slug,
                country: entityData.country,
                city: entityData.city,
                latitude: parseFloat(entityData.latitude),
                longitude: parseFloat(entityData.longitude),
                socials: entityData.socials || {},
                owner_id: submission.submitter_id,
                members_count: 0,
              })
              .select("id")
              .single();

            if (projectError) {
              throw new Error(
                `Failed to create project: ${projectError.message}`
              );
            }
            createdEntityId = project.id;
            break;
          }

          case "workspace": {
            const { generateHubSlug, getUniqueHubSlug } = await import(
              "@/lib/utils/hub-slug"
            );
            const entityData = submission.entity_data;
            
            // Для workspace адрес обязателен
            if (!entityData.address) {
              throw new Error("Address is required for workspace");
            }

            const baseSlug = generateHubSlug(entityData.name, entityData.city || entityData.country);
            const slug = await getUniqueHubSlug(baseSlug, async (slug) => {
              const { data } = await supabase
                .from("workspaces")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();
              return !!data;
            });

            const { data: workspace, error: workspaceError } = await supabase
              .from("workspaces")
              .insert({
                name: entityData.name,
                description: entityData.description,
                image_url: entityData.image_url,
                slug,
                country: entityData.country,
                country_code: entityData.country_code,
                city: entityData.city || null,
                address: entityData.address,
                latitude: parseFloat(entityData.latitude),
                longitude: parseFloat(entityData.longitude),
                socials: entityData.socials || {},
                owner_id: submission.submitter_id,
                members_count: 0,
              })
              .select("id")
              .single();

            if (workspaceError) {
              throw new Error(
                `Failed to create workspace: ${workspaceError.message}`
              );
            }
            createdEntityId = workspace.id;
            break;
          }

          default:
            return NextResponse.json(
              { error: `Unknown entity type: ${submission.entity_type}` },
              { status: 400 }
            );
        }

        // Обновляем заявку как одобренную
        const { data: updatedSubmission, error: updateError } = await supabase
          .from("entity_submissions")
          .update({
            status: "approved",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            admin_notes: admin_notes || null,
            approved_entity_id: createdEntityId,
            approved_entity_type: submission.entity_type,
          })
          .eq("id", id)
          .select(`
            *,
            submitter:profiles!entity_submissions_submitter_id_fkey(id, twitter_handle, twitter_name, avatar_url),
            reviewer:profiles!entity_submissions_reviewed_by_fkey(id, twitter_handle, twitter_name, avatar_url)
          `)
          .single();

        if (updateError) {
          console.error("Error updating submission:", updateError);
          // TODO: Откатить создание сущности, если обновление не удалось
          return NextResponse.json(
            { error: "Failed to update submission" },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { submission: updatedSubmission },
          { status: 200 }
        );
      } catch (error: any) {
        console.error("Error approving submission:", error);
        return NextResponse.json(
          { error: error.message || "Failed to approve submission" },
          { status: 500 }
        );
      }
    } else {
      // Reject
      if (!rejection_reason) {
        return NextResponse.json(
          { error: "rejection_reason is required for rejection" },
          { status: 400 }
        );
      }

      const { data: updatedSubmission, error: updateError } = await supabase
        .from("entity_submissions")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejection_reason,
          admin_notes: admin_notes || null,
        })
        .eq("id", id)
        .select(`
          *,
          submitter:profiles!entity_submissions_submitter_id_fkey(id, twitter_handle, twitter_name, avatar_url),
          reviewer:profiles!entity_submissions_reviewed_by_fkey(id, twitter_handle, twitter_name, avatar_url)
        `)
        .single();

      if (updateError) {
        console.error("Error updating submission:", updateError);
        return NextResponse.json(
          { error: "Failed to reject submission" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { submission: updatedSubmission },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


