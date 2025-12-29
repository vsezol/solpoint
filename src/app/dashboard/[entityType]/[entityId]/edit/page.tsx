import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EntityMembersList } from "./entity-members-list";
import { EntitySettingsForm } from "@/components/dashboard/entity-settings-form";
import { EntityEventsList } from "./entity-events-list";
import { getEntityConfig, type EntityType } from "@/lib/entity-config";
import type { Hub, Community, Project, Event, User, Workspace } from "@/types";

type Entity = Hub | Community | Project | Event | Workspace;

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

  // Получаем конфигурацию для типа сущности
  const config = getEntityConfig(entityType);

  // Универсальная загрузка сущности
  const { data: entityData, error: entityError } = await supabase
    .from(config.tableName)
    .select("*")
    .eq("id", entityId)
    .single();

  if (entityError || !entityData) {
    notFound();
  }

  const entity = entityData as Entity;
  let ownerUserId: string | null = null;

  // Для events owner может быть user или сущность
  if (entityType === "event") {
    const event = entity as Event;
    if (event.owner_type === "user") {
      ownerUserId = event.owner_id;
    } else {
      // Если owner - сущность, получаем owner_id этой сущности
      const parentConfig = getEntityConfig(event.owner_type as EntityType);
      const { data: parentEntity } = await supabase
        .from(parentConfig.tableName)
        .select(config.ownerIdField)
        .eq("id", event.owner_id)
        .single();
      ownerUserId = (parentEntity as any)?.[config.ownerIdField] || null;
    }
  } else {
    // Для остальных сущностей owner_id это user_id
    ownerUserId = (entity as any)[config.ownerIdField] || null;
  }

  if (!entity || !ownerUserId) {
    notFound();
  }

  // Проверяем, является ли пользователь владельцем
  if (ownerUserId !== authUser.id) {
    redirect("/dashboard");
  }

  // Универсальная загрузка участников
  let members: (User & { joined_at?: string; role?: "owner" | "moderator" | "member" })[] = [];

  if (entityType === "event") {
    // Для событий нужно объединить members с event_roles
    const { data: attendeesData } = await supabase
      .from("event_members")
      .select(`
        registered_at,
        status,
        user:profiles!event_members_user_id_fkey(*)
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
  } else {
    // Для остальных сущностей используем универсальный запрос
    const { data: membersData } = await supabase
      .from(config.membersTable)
      .select(`
        joined_at,
        role,
        user:profiles!${config.membersTable}_user_id_fkey(*)
      `)
      .eq("event_id", entityId)
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
              <EntitySettingsForm
                entity={entity}
                entityType={entityType}
                entityId={entityId}
                members={members}
                currentUserId={authUser.id}
              />
              {config.canHaveEvents && (
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

