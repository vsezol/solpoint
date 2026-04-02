import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type EntityType = "hub" | "community" | "project" | "workspace" | "event";

interface EntityConfig {
  tableName: string;
  membersTable: string;
  entityIdField: string;
  ownerIdField: string;
  dateField: string;
}

const ENTITY_CONFIGS: Record<EntityType, EntityConfig> = {
  hub: {
    tableName: "hubs",
    membersTable: "hub_members",
    entityIdField: "hub_id",
    ownerIdField: "owner_id",
    dateField: "joined_at",
  },
  community: {
    tableName: "communities",
    membersTable: "community_members",
    entityIdField: "community_id",
    ownerIdField: "owner_id",
    dateField: "joined_at",
  },
  project: {
    tableName: "projects",
    membersTable: "project_members",
    entityIdField: "project_id",
    ownerIdField: "owner_id",
    dateField: "joined_at",
  },
  workspace: {
    tableName: "workspaces",
    membersTable: "workspace_members",
    entityIdField: "workspace_id",
    ownerIdField: "owner_id",
    dateField: "joined_at",
  },
  event: {
    tableName: "events",
    membersTable: "event_members",
    entityIdField: "event_id",
    ownerIdField: "owner_id",
    dateField: "registered_at",
  },
};

/**
 * GET /api/members?entityType=hub&entityId=xxx&onlyTeam=false
 * Получение участников сущности
 * 
 * Query параметры:
 * - entityType: тип сущности (hub, community, project, workspace, event)
 * - entityId: ID сущности (UUID)
 * - onlyTeam: если true, возвращает только команду (owners/moderators), иначе всех участников
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const onlyTeam = searchParams.get("onlyTeam") === "true";

  // Валидация параметров
  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 }
    );
  }

  if (!ENTITY_CONFIGS[entityType as EntityType]) {
    return NextResponse.json(
      { error: "Invalid entity type" },
      { status: 400 }
    );
  }

  const config = ENTITY_CONFIGS[entityType as EntityType];
  const supabase = await createClient();

  const entitySelect =
    entityType === "event"
      ? `id, ${config.ownerIdField}, luma_event_id`
      : `id, ${config.ownerIdField}`;

  const [{ data: entity, error: entityError }, { data: { user: authUser } }] = await Promise.all([
    supabase
      .from(config.tableName)
      .select(entitySelect)
      .eq("id", entityId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (entityError) {
    return NextResponse.json(
      { error: `Failed to fetch ${entityType}`, details: entityError.message },
      { status: 500 }
    );
  }

  if (!entity) {
    return NextResponse.json(
      { error: `${entityType} not found` },
      { status: 404 }
    );
  }

  const ownerId = (entity as Record<string, any>)[config.ownerIdField];

  const { data: membersData, error: membersError } = await supabase
    .from(config.membersTable)
    .select(`
      user_id,
      ${config.dateField},
      user:profiles!user_id(
        id,
        twitter_id,
        twitter_handle,
        twitter_name,
        avatar_url,
        bio,
        country,
        country_code,
        city,
        role,
        is_open_to_meet,
        subscription_tier,
        is_verified,
        socials,
        last_active_at,
        created_at,
        updated_at,
        countries!fk_profiles_country_code (
          name
        )
      )
    `)
    .eq(config.entityIdField, entityId)
    .order(config.dateField, { ascending: false });

  if (membersError) {
    return NextResponse.json(
      { error: membersError.message || "Failed to fetch members", details: membersError },
      { status: 500 }
    );
  }

  const allMembers = (membersData || [])
    .filter((m: any) => !!m.user)
    .map((m: any) => {
      const user = Array.isArray(m.user) ? m.user[0] : (m.user as any);
      if (!user) return null;
      return {
        id: user.id,
        avatar_url: user.avatar_url,
        name: user.twitter_name,
        twitter_handle: user.twitter_handle,
        isVip: user.subscription_tier === "vip",
        isVerified: user.is_verified,
        isOwner: user.id === ownerId,
        joinedAt: m[config.dateField],
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  // Если onlyTeam=true, возвращаем только команду
  if (onlyTeam) {
    const team = allMembers.filter((m) => m.isOwner);
    return NextResponse.json(
      {
        totalMembers: allMembers.length,
        totalFriends: 0,
        members: team,
        friends: [],
        team: team,
      },
      { status: 200 }
    );
  }

  // Разделяем на команду (owners) и всех участников
  const team = allMembers.filter((m) => m.isOwner);

  // Получаем друзей авторизованного пользователя (если авторизован)
  let friends: typeof allMembers = [];
  const friendIds: string[] = [];

  if (authUser) {
    // Получаем взаимных друзей
    const { data: mutualFriendsData } = await supabase
      .from("mutual_friends")
      .select("user_id, friend_id")
      .or(`user_id.eq.${authUser.id},friend_id.eq.${authUser.id}`);

    if (mutualFriendsData) {
      for (const mf of mutualFriendsData) {
        if (mf.user_id === authUser.id) {
          friendIds.push(mf.friend_id);
        } else if (mf.friend_id === authUser.id) {
          friendIds.push(mf.user_id);
        }
      }
    }

    // Находим друзей среди участников
    const memberUserIds = new Set(allMembers.map((m) => m.id));
    const friendsInEntity = friendIds.filter((id) => memberUserIds.has(id));

    if (friendsInEntity.length > 0) {
      friends = allMembers.filter((m) => friendsInEntity.includes(m.id));
    }
  }

  // Возвращаем всех участников (без ограничений)
  // Исключаем владельцев из списка участников, чтобы не дублировать их
  const regularMembers = allMembers.filter((m) => !m.isOwner);
  const allMembersList = regularMembers.length > 0 
    ? regularMembers
    : allMembers; // Если все участники - владельцы, показываем их

  // For events: load external attendees (Luma) when event has luma_event_id
  let external: Array<{ id: string; name: string | null; avatar: string | null; profile_url: string; social_links: Record<string, string> }> = [];
  if (entityType === "event") {
    const lumaEventId = (entity as { luma_event_id?: string | null })?.luma_event_id;
    if (lumaEventId) {
      const { data: lumaAttendees } = await supabase
        .from("luma_event_attendees")
        .select(`
          id,
          user_id,
          luma_users(
            id,
            luma_profile_url,
            name,
            avatar,
            social_links
          )
        `)
        .eq("event_id", lumaEventId);

      if (lumaAttendees?.length) {
        external = lumaAttendees.map((row: {
          id: string;
          user_id: string;
          luma_users: { id: string; luma_profile_url: string; name: string | null; avatar: string | null; social_links: unknown } | { id: string; luma_profile_url: string; name: string | null; avatar: string | null; social_links: unknown }[] | null;
        }) => {
          const raw = row.luma_users;
          const u = Array.isArray(raw) ? raw[0] : raw;
          return {
            id: u?.id ?? row.user_id,
            name: u?.name ?? null,
            avatar: u?.avatar ?? null,
            profile_url: u?.luma_profile_url ?? "",
            social_links: (u?.social_links as Record<string, string>) ?? {},
          };
        });
      }
    }
  }

  const response = {
    totalMembers: allMembers.length,
    totalFriends: friends.length,
    members: allMembersList, // Все участники, не только превью
    friends: friends, // Все друзья, не только превью
    team: team,
    ...(entityType === "event" ? { external } : {}),
  };

  return NextResponse.json(response, { status: 200 });
}

