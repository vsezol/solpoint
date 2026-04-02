import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";

async function getInternalGoingCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string
): Promise<{ count: number; error: string | null }> {
  const { count, error } = await supabase
    .from("event_members")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "going");

  if (error) {
    return { count: 0, error: error.message || "Failed to check event capacity" };
  }

  return { count: count || 0, error: null };
}

/**
 * GET /api/events/[id]/members
 * Список участников ивента
 * Требует аутентификации
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const supabase = await createClient();
  const { identifier } = await params;
  
  // Преобразуем identifier в ID
  const id = await getEntityIdByIdentifier("event", identifier);
  if (!id) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Проверяем существование ивента и luma_event_id (для external attendees)
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, visibility, luma_event_id")
    .eq("id", id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Проверяем доступ к VIP ивенту
  if (event.visibility === "vip_only") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", authUser.id)
      .single();
    if (profile?.subscription_tier !== "vip") {
      return NextResponse.json(
        { error: "This event is PRO only" },
        { status: 403 }
      );
    }
  }

  // Фильтр по статусу
  const status = searchParams.get("status");
  let query = supabase
    .from("event_members")
    .select(`
      *,
      user:profiles!event_members_user_id_fkey(
        id,
        twitter_handle,
        twitter_name,
        avatar_url,
        bio,
        country,
        city,
        role
      )
    `)
    .eq("event_id", id)
    .order("registered_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data: internalMembers, error } = await query;

  if (error) {
    console.error("Error fetching event members:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch members" },
      { status: 500 }
    );
  }

  // Для external событий (luma_event_id задан) подтягиваем участников из luma_event_attendees
  type ExternalAttendee = { id: string; name: string | null; avatar: string | null; luma_profile_url: string; social_links: Record<string, string> };
  let external: ExternalAttendee[] = [];
  if (event.luma_event_id) {
    const { data: lumaAttendees } = await supabase
      .from("luma_event_attendees")
      .select(`
        id,
        user_id,
        luma_users(
          luma_profile_url,
          name,
          avatar,
          social_links
        )
      `)
      .eq("event_id", event.luma_event_id);

    if (lumaAttendees) {
      external = lumaAttendees.map((row: {
        id: string;
        user_id: string;
        luma_users: { luma_profile_url: string; name: string | null; avatar: string | null; social_links: unknown } | { luma_profile_url: string; name: string | null; avatar: string | null; social_links: unknown }[] | null;
      }) => {
        const raw = row.luma_users;
        const u = Array.isArray(raw) ? raw[0] : raw;
        return {
          id: row.id,
          name: u?.name ?? null,
          avatar: u?.avatar ?? null,
          luma_profile_url: u?.luma_profile_url ?? "",
          social_links: (u?.social_links as Record<string, string>) ?? {},
        };
      });
    }
  }

  return NextResponse.json(
    {
      internal: internalMembers || [],
      external,
    },
    { status: 200 }
  );
}

/**
 * POST /api/events/[id]/members
 * Регистрация на ивент
 * Требует аутентификации
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const supabase = await createClient();
  const { identifier } = await params;
  
  // Преобразуем identifier в ID
  const id = await getEntityIdByIdentifier("event", identifier);
  if (!id) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { status = "going" } = body;

    // Валидация статуса
    if (!["going", "maybe", "not_going"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: going, maybe, or not_going" },
        { status: 400 }
      );
    }

    // Проверяем существование ивента и доступ
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, visibility, max_attendees, registration_deadline, luma_link, socials")
      .eq("id", id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Проверяем доступ к VIP ивенту
    if (event.visibility === "vip_only") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", authUser.id)
        .single();
      if (profile?.subscription_tier !== "vip") {
        return NextResponse.json(
          { error: "This event is PRO only" },
          { status: 403 }
        );
      }
    }

    // Проверяем дедлайн регистрации
    if (event.registration_deadline) {
      const deadline = new Date(event.registration_deadline);
      if (new Date() > deadline) {
        return NextResponse.json(
          { error: "Registration deadline has passed" },
          { status: 400 }
        );
      }
    }

    // Проверяем, не зарегистрирован ли уже
    const { data: existingMember } = await supabase
      .from("event_members")
      .select("id")
      .eq("event_id", id)
      .eq("user_id", authUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "Already registered for this event" },
        { status: 400 }
      );
    }

    // Проверяем capacity (только для статуса "going")
    if (status === "going" && event.max_attendees) {
      const { count: goingCount, error: countError } = await getInternalGoingCount(supabase, id);
      if (countError) {
        return NextResponse.json({ error: countError }, { status: 500 });
      }

      if (goingCount >= event.max_attendees) {
        return NextResponse.json(
          { error: "Event is full" },
          { status: 400 }
        );
      }
    }

    // Регистрируем пользователя
    const { data: member, error: insertError } = await supabase
      .from("event_members")
      .insert({
        event_id: id,
        user_id: authUser.id,
        status,
      })
      .select(`
        *,
        user:profiles!event_members_user_id_fkey(
          id,
          twitter_handle,
          twitter_name,
          avatar_url
        )
      `)
      .single();

    if (insertError) {
      console.error("Error registering for event:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to register for event" },
        { status: 500 }
      );
    }

    // Если пользователь регистрируется со статусом "going" и у ивента есть luma_link,
    // добавляем его в socials, если его там еще нет
    if (status === "going" && event.luma_link) {
      const currentSocials = (event.socials as Record<string, string>) || {};
      
      // Проверяем, есть ли уже luma_link в socials
      if (!currentSocials.luma && !currentSocials.website) {
        // Добавляем luma_link в socials как "luma"
        const updatedSocials = {
          ...currentSocials,
          luma: event.luma_link,
        };

        // Обновляем socials в базе данных
        const { error: updateError } = await supabase
          .from("events")
          .update({ socials: updatedSocials })
          .eq("id", id);

        if (updateError) {
          console.error("Error updating event socials:", updateError);
          // Не возвращаем ошибку, так как регистрация уже прошла успешно
        }
      }
    }

    return NextResponse.json({ member }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]/members
 * Отмена регистрации на ивент
 * Требует аутентификации
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const supabase = await createClient();
  const { identifier: id } = await params;

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Удаляем регистрацию
  const { error: deleteError } = await supabase
    .from("event_members")
    .delete()
    .eq("event_id", id)
    .eq("user_id", authUser.id);

  if (deleteError) {
    console.error("Error unregistering from event:", deleteError);
    return NextResponse.json(
      { error: deleteError.message || "Failed to unregister from event" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Successfully unregistered from event" },
    { status: 200 }
  );
}

/**
 * PATCH /api/events/[id]/members
 * Изменение статуса участия (going/maybe/not_going)
 * Требует аутентификации
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const supabase = await createClient();
  const { identifier: id } = await params;

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    // Валидация статуса
    if (!status || !["going", "maybe", "not_going"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: going, maybe, or not_going" },
        { status: 400 }
      );
    }

    // Проверяем, зарегистрирован ли пользователь
    const { data: existingMember } = await supabase
      .from("event_members")
      .select("id, status")
      .eq("event_id", id)
      .eq("user_id", authUser.id)
      .single();

    if (!existingMember) {
      return NextResponse.json(
        { error: "Not registered for this event" },
        { status: 404 }
      );
    }

    // Проверяем capacity при изменении на "going"
    if (status === "going") {
      const { data: event } = await supabase
        .from("events")
        .select("max_attendees")
        .eq("id", id)
        .single();

      const { count: goingCount, error: countError } = await getInternalGoingCount(supabase, id);
      if (countError) {
        return NextResponse.json({ error: countError }, { status: 500 });
      }

      if (event?.max_attendees && goingCount >= event.max_attendees) {
        // Если текущий статус был "going", то capacity уже занят этим пользователем
        // Но если был "maybe" или "not_going", то нужно проверить
        if (existingMember.status !== "going") {
          return NextResponse.json(
            { error: "Event is full" },
            { status: 400 }
          );
        }
      }
    }

    // Обновляем статус
    const { data: member, error: updateError } = await supabase
      .from("event_members")
      .update({ status })
      .eq("event_id", id)
      .eq("user_id", authUser.id)
      .select(`
        *,
        user:profiles!event_members_user_id_fkey(
          id,
          twitter_handle,
          twitter_name,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      console.error("Error updating member status:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ member }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

