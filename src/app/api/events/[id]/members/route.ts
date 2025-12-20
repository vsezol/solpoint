import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/events/[id]/members
 * Список участников ивента
 * Требует аутентификации
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { id } = params;
  const { searchParams } = new URL(request.url);

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Проверяем существование ивента
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, visibility")
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
        { error: "This event is VIP only" },
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

  const { data: members, error } = await query;

  if (error) {
    console.error("Error fetching event members:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch members" },
      { status: 500 }
    );
  }

  return NextResponse.json({ members: members || [] }, { status: 200 });
}

/**
 * POST /api/events/[id]/members
 * Регистрация на ивент
 * Требует аутентификации
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { id } = params;

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
      .select("id, visibility, max_attendees, attendees_count, registration_deadline")
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
          { error: "This event is VIP only" },
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
      if (event.attendees_count >= event.max_attendees) {
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

    return NextResponse.json({ member }, { status: 201 });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
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
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { id } = params;

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
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { id } = params;

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
      .select("id")
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
        .select("max_attendees, attendees_count")
        .eq("id", id)
        .single();

      if (event?.max_attendees && event.attendees_count >= event.max_attendees) {
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
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



