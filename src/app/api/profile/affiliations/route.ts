import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/profile/affiliations
 * Получить список affiliations пользователя (хабы, комьюнити, проекты, воркспейсы, события)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
    const affiliations: any[] = [];

    // 1. Хабы (hub_members и creator)
    const { data: hubs, error: hubsError } = await supabase
      .from("hub_members")
      .select(
        `
        hub_id,
        hubs (
          id,
          name,
          slug,
          image_url,
          country,
          city
        )
      `
      )
      .eq("user_id", userId);

    if (!hubsError && hubs) {
      hubs.forEach((hub: any) => {
        const hubData = Array.isArray(hub.hubs) ? hub.hubs[0] : hub.hubs;
        if (hubData) {
          affiliations.push({
            id: hubData.id,
            name: hubData.name,
            slug: hubData.slug,
            image_url: hubData.image_url,
            type: "hub",
            country: hubData.country,
            city: hubData.city,
          });
        }
      });
    }

    // Также проверяем, является ли пользователь владельцем хаба (если еще не добавлен)
    const { data: ownedHubs, error: ownedHubsError } = await supabase
      .from("hubs")
      .select("id, name, slug, image_url, country, city")
      .eq("owner_id", userId);

    if (!ownedHubsError && ownedHubs) {
      const existingHubIds = new Set(
        affiliations
          .filter((a) => a.type === "hub")
          .map((a) => a.id)
      );

      ownedHubs.forEach((hub: any) => {
        if (!existingHubIds.has(hub.id)) {
          affiliations.push({
            id: hub.id,
            name: hub.name,
            slug: hub.slug,
            image_url: hub.image_url,
            type: "hub",
            country: hub.country,
            city: hub.city,
          });
        }
      });
    }

    // 2. Комьюнити (community_members и creator)
    const { data: communities, error: communitiesError } = await supabase
      .from("community_members")
      .select(
        `
        community_id,
        communities (
          id,
          name,
          slug,
          image_url,
          country,
          city
        )
      `
      )
      .eq("user_id", userId);

    if (!communitiesError && communities) {
      communities.forEach((community: any) => {
        const communityData = Array.isArray(community.communities)
          ? community.communities[0]
          : community.communities;
        if (communityData) {
          affiliations.push({
            id: communityData.id,
            name: communityData.name,
            slug: communityData.slug,
            image_url: communityData.image_url,
            type: "community",
            country: communityData.country,
            city: communityData.city,
          });
        }
      });
    }

    // Также проверяем, является ли пользователь владельцем комьюнити (если еще не добавлен)
    const { data: ownedCommunities, error: ownedCommunitiesError } = await supabase
      .from("communities")
      .select("id, name, slug, image_url, country, city")
      .eq("owner_id", userId);

    if (!ownedCommunitiesError && ownedCommunities) {
      const existingCommunityIds = new Set(
        affiliations
          .filter((a) => a.type === "community")
          .map((a) => a.id)
      );

      ownedCommunities.forEach((community: any) => {
        if (!existingCommunityIds.has(community.id)) {
          affiliations.push({
            id: community.id,
            name: community.name,
            slug: community.slug,
            image_url: community.image_url,
            type: "community",
            country: community.country,
            city: community.city,
          });
        }
      });
    }

    // 3. Проекты (project_members и creator)
    const { data: projects, error: projectsError } = await supabase
      .from("project_members")
      .select(
        `
        project_id,
        projects (
          id,
          name,
          slug,
          image_url,
          country,
          city
        )
      `
      )
      .eq("user_id", userId);

    if (!projectsError && projects) {
      projects.forEach((project: any) => {
        const projectData = Array.isArray(project.projects)
          ? project.projects[0]
          : project.projects;
        if (projectData) {
          affiliations.push({
            id: projectData.id,
            name: projectData.name,
            slug: projectData.slug,
            image_url: projectData.image_url,
            type: "project",
            country: projectData.country,
            city: projectData.city,
          });
        }
      });
    }

    // Также проверяем, является ли пользователь владельцем проекта (если еще не добавлен)
    const { data: ownedProjects, error: ownedProjectsError } = await supabase
      .from("projects")
      .select("id, name, slug, image_url, country, city")
      .eq("owner_id", userId);

    if (!ownedProjectsError && ownedProjects) {
      const existingProjectIds = new Set(
        affiliations
          .filter((a) => a.type === "project")
          .map((a) => a.id)
      );

      ownedProjects.forEach((project: any) => {
        if (!existingProjectIds.has(project.id)) {
          affiliations.push({
            id: project.id,
            name: project.name,
            slug: project.slug,
            image_url: project.image_url,
            type: "project",
            country: project.country,
            city: project.city,
          });
        }
      });
    }

    // 4. Воркспейсы (workspace_members и owner)
    // Проверяем, является ли пользователь членом воркспейса
    const { data: workspaceMembers, error: workspaceMembersError } = await supabase
      .from("workspace_members")
      .select(
        `
        workspace_id,
        workspaces (
          id,
          name,
          slug,
          image_url,
          country,
          country_code,
          city
        )
      `
      )
      .eq("user_id", userId);

    if (!workspaceMembersError && workspaceMembers) {
      workspaceMembers.forEach((wm: any) => {
        const workspaceData = Array.isArray(wm.workspaces)
          ? wm.workspaces[0]
          : wm.workspaces;
        if (workspaceData) {
          affiliations.push({
            id: workspaceData.id,
            name: workspaceData.name,
            slug: workspaceData.slug,
            image_url: workspaceData.image_url,
            type: "workspace",
            country: workspaceData.country_code || workspaceData.country,
            city: workspaceData.city,
          });
        }
      });
    }

    // Также проверяем, является ли пользователь владельцем воркспейса (если еще не добавлен)
    const { data: ownedWorkspaces, error: ownedWorkspacesError } = await supabase
      .from("workspaces")
      .select("id, name, slug, image_url, country, country_code, city")
      .eq("owner_id", userId);

    if (!ownedWorkspacesError && ownedWorkspaces) {
      const existingWorkspaceIds = new Set(
        affiliations
          .filter((a) => a.type === "workspace")
          .map((a) => a.id)
      );

      ownedWorkspaces.forEach((workspace: any) => {
        if (!existingWorkspaceIds.has(workspace.id)) {
          affiliations.push({
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            image_url: workspace.image_url,
            type: "workspace",
            country: workspace.country_code || workspace.country,
            city: workspace.city,
          });
        }
      });
    }

    // 5. События (event_attendees)
    const { data: events, error: eventsError } = await supabase
      .from("event_attendees")
      .select(
        `
        event_id,
        events (
          id,
          name,
          slug,
          image_url,
          country,
          city,
          start_date
        )
      `
      )
      .eq("user_id", userId);

    if (!eventsError && events) {
      events.forEach((event: any) => {
        const eventData = Array.isArray(event.events) ? event.events[0] : event.events;
        if (eventData) {
          affiliations.push({
            id: eventData.id,
            name: eventData.name,
            slug: eventData.slug,
            image_url: eventData.image_url,
            type: "event",
            country: eventData.country,
            city: eventData.city,
            start_date: eventData.start_date,
          });
        }
      });
    }

    return NextResponse.json({
      affiliations,
      count: affiliations.length,
    });
  } catch (error: any) {
    console.error("Get affiliations error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get affiliations" },
      { status: 500 }
    );
  }
}

