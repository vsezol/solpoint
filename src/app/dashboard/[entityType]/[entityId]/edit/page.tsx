import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header, Footer } from "@/components/layout";
import { Card, Button } from "@/components/ui";
import { Settings, Users, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EntityMembersList } from "./entity-members-list";
import { EntitySettings } from "./entity-settings";
import { EntityEventsList } from "./entity-events-list";
import type { Hub, Community, Project, Event, User } from "@/types";

type EntityType = "hub" | "community" | "project" | "workspace" | "event";
type Entity = Hub | Community | Project | Event;

interface EntityEditPageProps {
  params: Promise<{ entityType: EntityType; entityId: string }>;
}

export default async function EntityEditPage({ params }: EntityEditPageProps) {
  const { entityType, entityId } = await params;
  const supabase = await createClient();

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/login");
  }

  // Получаем сущность в зависимости от типа
  let entity: Entity | null = null;
  let ownerId: string | null = null;
  let ownerUserId: string | null = null; // ID пользователя-владельца (для events может быть через сущность)

  if (entityType === "hub") {
    const { data, error } = await supabase
      .from("hubs")
      .select("*")
      .eq("id", entityId)
      .single();
    
    if (!error && data) {
      entity = data as Hub;
      ownerId = entity.owner_id || null;
      ownerUserId = ownerId; // Для hubs owner_id это user_id
    }
  } else if (entityType === "community") {
    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .eq("id", entityId)
      .single();
    
    if (!error && data) {
      entity = data as Community;
      ownerId = entity.owner_id || null;
      ownerUserId = ownerId; // Для communities owner_id это user_id
    }
  } else if (entityType === "project" || entityType === "workspace") {
    // workspace и project - это одно и то же
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", entityId)
      .single();
    
    if (!error && data) {
      entity = data as Project;
      ownerId = entity.owner_id || null;
      ownerUserId = ownerId; // Для projects owner_id это user_id
    }
  } else if (entityType === "event") {
    const { data, error } = await supabase
      .from("events")
      .select("*, owner_type, owner_id")
      .eq("id", entityId)
      .single();
    
    if (!error && data) {
      entity = data as Event;
      const event = entity as Event;
      
      // Для events owner может быть user или сущность
      if (event.owner_type === "user") {
        ownerUserId = event.owner_id;
      } else {
        // Если owner - сущность, получаем owner_id этой сущности
        ownerId = event.owner_id;
        if (event.owner_type === "hub") {
          const { data: hub } = await supabase
            .from("hubs")
            .select("owner_id")
            .eq("id", event.owner_id)
            .single();
          ownerUserId = hub?.owner_id || null;
        } else if (event.owner_type === "community") {
          const { data: community } = await supabase
            .from("communities")
            .select("owner_id")
            .eq("id", event.owner_id)
            .single();
          ownerUserId = community?.owner_id || null;
        } else if (event.owner_type === "project") {
          const { data: project } = await supabase
            .from("projects")
            .select("owner_id")
            .eq("id", event.owner_id)
            .single();
          ownerUserId = project?.owner_id || null;
        }
      }
    }
  } else {
    notFound();
  }

  if (!entity || !ownerUserId) {
    notFound();
  }

  // Проверяем, является ли пользователь владельцем
  if (ownerUserId !== authUser.id) {
    redirect("/dashboard");
  }

  // Получаем участников с ролями из БД
  let members: (User & { joined_at?: string; role?: "owner" | "moderator" | "member" })[] = [];

  if (entityType === "event") {
    // Для событий нужно объединить attendees с event_roles
    const { data: attendeesData } = await supabase
      .from("event_attendees")
      .select(`
        registered_at,
        user:profiles!event_attendees_user_id_fkey(*)
      `)
      .eq("event_id", entityId)
      .order("registered_at", { ascending: false });

    // Получаем роли из event_roles
    const { data: rolesData } = await supabase
      .from("event_roles")
      .select("user_id, role")
      .eq("event_id", entityId);

    const rolesMap = new Map(
      (rolesData || []).map((r: any) => [r.user_id, r.role])
    );

    members = (attendeesData || []).map((m: any) => {
      let role: "owner" | "moderator" | "member" = "member";
      if (m.user.id === ownerUserId) {
        role = "owner";
      } else if (rolesMap.has(m.user.id)) {
        role = rolesMap.get(m.user.id) as "moderator";
      }
      return {
        ...m.user,
        joined_at: m.registered_at,
        role,
      };
    }).filter((u): u is User & { joined_at?: string; role: "owner" | "moderator" | "member" } => u !== null);
  } else if (entityType === "hub") {
    const { data: membersData } = await supabase
      .from("hub_members")
      .select(`
        joined_at,
        role,
        user:profiles!hub_members_user_id_fkey(*)
      `)
      .eq("hub_id", entityId)
      .order("joined_at", { ascending: false });

    members = (membersData || []).map((m: any) => ({
      ...m.user,
      joined_at: m.joined_at,
      role: (m.role || (m.user.id === ownerUserId ? "owner" : "member")) as "owner" | "moderator" | "member",
    })).filter((u): u is User & { joined_at?: string; role: "owner" | "moderator" | "member" } => u !== null);
  } else if (entityType === "community") {
    const { data: membersData } = await supabase
      .from("community_members")
      .select(`
        joined_at,
        role,
        user:profiles!community_members_user_id_fkey(*)
      `)
      .eq("community_id", entityId)
      .order("joined_at", { ascending: false });

    members = (membersData || []).map((m: any) => ({
      ...m.user,
      joined_at: m.joined_at,
      role: (m.role || (m.user.id === ownerUserId ? "owner" : "member")) as "owner" | "moderator" | "member",
    })).filter((u): u is User & { joined_at?: string; role: "owner" | "moderator" | "member" } => u !== null);
  } else if (entityType === "project" || entityType === "workspace") {
    const { data: membersData } = await supabase
      .from("project_members")
      .select(`
        joined_at,
        role,
        user:profiles!project_members_user_id_fkey(*)
      `)
      .eq("project_id", entityId)
      .order("joined_at", { ascending: false });

    members = (membersData || []).map((m: any) => ({
      ...m.user,
      joined_at: m.joined_at,
      role: (m.role || (m.user.id === ownerUserId ? "owner" : "member")) as "owner" | "moderator" | "member",
    })).filter((u): u is User & { joined_at?: string; role: "owner" | "moderator" | "member" } => u !== null);
  }

  // Получаем владельца
  const { data: creator } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", ownerUserId)
    .single();

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
                  {entity.name}
                </h1>
                <p className="text-[var(--color-text-secondary)] capitalize">
                  {entityType}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-[40%_60%] gap-8">
            {/* Left Side - Settings (40% on desktop, full width on mobile) */}
            <div className="space-y-6 lg:order-1 order-2">
              <EntitySettings
                entity={entity}
                entityType={entityType}
                entityId={entityId}
                members={members}
                currentUserId={authUser.id}
              />
              {entityType !== "event" && (
                <EntityEventsList
                  entityId={entityId}
                  entityType={entityType}
                />
              )}
            </div>

            {/* Right Side - Members (60% on desktop, full width on mobile) */}
            <div className="lg:order-2 order-1">
              <EntityMembersList
                members={members}
                creator={creator as User}
                entityId={entityId}
                entityType={entityType}
                currentUserId={authUser.id}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

