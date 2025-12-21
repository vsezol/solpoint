import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header, Footer } from "@/components/layout";
import { Card, Button } from "@/components/ui";
import { Settings, Users, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EntityMembersList } from "./entity-members-list";
import { EntitySettings } from "./entity-settings";
import { EntityEventsList } from "./entity-events-list";
import type { Hub, Community, Project, User } from "@/types";

type EntityType = "hub" | "community" | "project" | "workspace";
type Entity = Hub | Community | Project;

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
  let creatorId: string | null = null;

  if (entityType === "hub") {
    const { data, error } = await supabase
      .from("hubs")
      .select("*")
      .eq("id", entityId)
      .single();
    
    if (!error && data) {
      entity = data as Hub;
      creatorId = entity.creator_id || null;
    }
  } else if (entityType === "community") {
    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .eq("id", entityId)
      .single();
    
    if (!error && data) {
      entity = data as Community;
      creatorId = entity.creator_id || null;
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
      creatorId = entity.creator_id || null;
    }
  } else {
    notFound();
  }

  if (!entity || !creatorId) {
    notFound();
  }

  // Проверяем, является ли пользователь создателем
  if (creatorId !== authUser.id) {
    redirect("/dashboard");
  }

  // Получаем участников
  let members: (User & { joined_at?: string; role?: "owner" | "member" })[] = [];

  if (entityType === "hub") {
    const { data: membersData } = await supabase
      .from("hub_members")
      .select(`
        joined_at,
        user:profiles!hub_members_user_id_fkey(*)
      `)
      .eq("hub_id", entityId)
      .order("joined_at", { ascending: false });

    members = (membersData || []).map((m: any) => ({
      ...m.user,
      joined_at: m.joined_at,
      role: m.user.id === creatorId ? "owner" : "member",
    })).filter((u): u is User & { joined_at?: string; role: "owner" | "member" } => u !== null);
  } else if (entityType === "community") {
    const { data: membersData } = await supabase
      .from("community_members")
      .select(`
        joined_at,
        user:profiles!community_members_user_id_fkey(*)
      `)
      .eq("community_id", entityId)
      .order("joined_at", { ascending: false });

    members = (membersData || []).map((m: any) => ({
      ...m.user,
      joined_at: m.joined_at,
      role: m.user.id === creatorId ? "owner" : "member",
    })).filter((u): u is User & { joined_at?: string; role: "owner" | "member" } => u !== null);
  } else if (entityType === "project" || entityType === "workspace") {
    const { data: membersData } = await supabase
      .from("project_members")
      .select(`
        joined_at,
        user:profiles!project_members_user_id_fkey(*)
      `)
      .eq("project_id", entityId)
      .order("joined_at", { ascending: false });

    members = (membersData || []).map((m: any) => ({
      ...m.user,
      joined_at: m.joined_at,
      role: m.user.id === creatorId ? "owner" : "member",
    })).filter((u): u is User & { joined_at?: string; role: "owner" | "member" } => u !== null);
  }

  // Получаем создателя
  const { data: creator } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", creatorId)
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
              />
              <EntityEventsList
                entityId={entityId}
                entityType={entityType}
              />
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

