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

  // Получаем информацию о сущности (для owner_id)
  console.log(`[API Members] Fetching ${entityType} with ID:`, entityId);
  console.log(`[API Members] Table name:`, config.tableName);
  console.log(`[API Members] Owner field:`, config.ownerIdField);
  
  // Используем maybeSingle() вместо single() для более мягкой обработки ошибок
  const { data: entity, error: entityError } = await supabase
    .from(config.tableName)
    .select(`id, ${config.ownerIdField}`)
    .eq("id", entityId)
    .maybeSingle();

  console.log(`[API Members] Entity query result:`, { entity, entityError });

  if (entityError) {
    console.error(`[API Members] Error fetching ${entityType}:`, entityError);
    return NextResponse.json(
      { error: `Failed to fetch ${entityType}`, details: entityError.message },
      { status: 500 }
    );
  }

  if (!entity) {
    console.error(`[API Members] ${entityType} not found with ID:`, entityId);
    return NextResponse.json(
      { error: `${entityType} not found` },
      { status: 404 }
    );
  }

  const ownerId = (entity as Record<string, any>)[config.ownerIdField];

  // Получаем текущего пользователя (если авторизован)
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Получаем участников
  // В Supabase PostgREST используем синтаксис table!column_name для join'ов
  console.log(`[API Members] Fetching members from table:`, config.membersTable);
  console.log(`[API Members] Using entityIdField:`, config.entityIdField);
  console.log(`[API Members] Searching for entityId:`, entityId);
  
  // Сначала проверим, есть ли вообще записи в таблице с этим event_id
  const { data: rawData, error: rawError } = await supabase
    .from(config.membersTable)
    .select(`${config.entityIdField}, user_id`)
    .eq(config.entityIdField, entityId);
  
  console.log(`[API Members] Raw query (without join) result:`, {
    count: rawData?.length || 0,
    error: rawError,
    sample: rawData?.[0] || null
  });
  
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
        wallet_address,
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

  console.log(`[API Members] Members query result (with join):`, { 
    count: membersData?.length || 0, 
    error: membersError,
    errorDetails: membersError ? JSON.stringify(membersError, null, 2) : null,
    sampleData: membersData?.[0] ? JSON.stringify(membersData[0], null, 2) : null
  });

  if (membersError) {
    console.error(`[API Members] Error fetching ${entityType} members:`, membersError);
    return NextResponse.json(
      { error: membersError.message || "Failed to fetch members", details: membersError },
      { status: 500 }
    );
  }

  // Форматируем участников
  console.log(`[API Members] Raw membersData length:`, membersData?.length || 0);
  console.log(`[API Members] Owner ID:`, ownerId);
  
  const allMembers = (membersData || [])
    .filter((m: any) => {
      const hasUser = !!m.user;
      if (!hasUser) {
        console.log(`[API Members] Member without user:`, { user_id: m.user_id, dateField: m[config.dateField] });
      }
      return hasUser;
    })
    .map((m: any) => {
      const user = Array.isArray(m.user) ? m.user[0] : (m.user as any);
      if (!user) {
        console.log(`[API Members] User is null/undefined for member:`, m.user_id);
        return null;
      }

      const member = {
        id: user.id,
        avatar_url: user.avatar_url,
        name: user.twitter_name,
        twitter_handle: user.twitter_handle,
        isVip: user.subscription_tier === "vip",
        isVerified: user.is_verified,
        isOwner: user.id === ownerId,
        joinedAt: m[config.dateField],
      };
      
      return member;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  console.log(`[API Members] Formatted allMembers length:`, allMembers.length);
  console.log(`[API Members] Sample formatted member:`, allMembers[0] || null);

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
  
  console.log(`[API Members] Team members:`, team.length);
  console.log(`[API Members] All members:`, allMembers.length);

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

  const response = {
    totalMembers: allMembers.length,
    totalFriends: friends.length,
    members: allMembersList, // Все участники, не только превью
    friends: friends, // Все друзья, не только превью
    team: team,
  };

  console.log(`[API Members] Final response:`, {
    totalMembers: response.totalMembers,
    totalFriends: response.totalFriends,
    membersCount: response.members.length,
    friendsCount: response.friends.length,
    teamCount: response.team.length,
    sampleMember: response.members[0] || null,
  });

  return NextResponse.json(response, { status: 200 });
}

