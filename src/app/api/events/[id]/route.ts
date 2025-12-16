import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/events/[id]
 * Получение деталей ивента по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { id } = params;

  // Проверяем аутентификацию для VIP ивентов
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let isVip = false;
  if (authUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", authUser.id)
      .single();
    isVip = profile?.subscription_tier === "vip";
  }

  // Получаем ивент с связанными данными
  const { data: event, error } = await supabase
    .from("events")
    .select(`
      *,
      organizer:profiles!events_organizer_id_fkey(
        id,
        twitter_handle,
        twitter_name,
        avatar_url,
        bio,
        country,
        city
      ),
      hub:hubs(
        id,
        name,
        description,
        image_url,
        country,
        city
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch event" },
      { status: 500 }
    );
  }

  // Проверяем доступ к VIP ивенту
  if (event.visibility === "vip_only" && !isVip) {
    return NextResponse.json(
      { error: "This event is VIP only" },
      { status: 403 }
    );
  }

  return NextResponse.json({ event }, { status: 200 });
}

/**
 * PATCH /api/events/[id]
 * Обновление ивента
 * Только организатор или участник хаба-организатора может обновлять
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

  // Проверяем, является ли пользователь организатором
  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("organizer_id, hub_id")
    .eq("id", id)
    .single();

  if (fetchError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Проверяем права доступа
  const isOrganizer = event.organizer_id === authUser.id;
  let isHubMember = false;

  if (event.hub_id) {
    const { data: hubMember } = await supabase
      .from("hub_members")
      .select("id")
      .eq("hub_id", event.hub_id)
      .eq("user_id", authUser.id)
      .single();
    isHubMember = !!hubMember;
  }

  if (!isOrganizer && !isHubMember) {
    return NextResponse.json(
      { error: "Only organizer or hub member can update this event" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const updates: any = {};

    // Разрешенные поля для обновления
    const allowedFields = [
      "name",
      "description",
      "image_url",
      "country",
      "country_code",
      "city",
      "address",
      "venue_name",
      "latitude",
      "longitude",
      "start_date",
      "end_date",
      "timezone",
      "event_type",
      "visibility",
      "is_paid",
      "price_sol",
      "price_usd",
      "max_attendees",
      "registration_deadline",
      "is_online",
      "socials",
      "contacts",
      "hub_id",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        if (field === "latitude" || field === "longitude") {
          updates[field] = parseFloat(body[field]);
        } else if (field === "price_sol" || field === "price_usd") {
          updates[field] = body[field] ? parseFloat(body[field]) : null;
        } else if (field === "max_attendees") {
          updates[field] = body[field] ? parseInt(body[field], 10) : null;
        } else if (
          field === "start_date" ||
          field === "end_date" ||
          field === "registration_deadline"
        ) {
          updates[field] = body[field]
            ? new Date(body[field]).toISOString()
            : null;
        } else {
          updates[field] = body[field];
        }
      }
    }

    // Если обновляется slug (при изменении названия/города/даты)
    if (updates.name || updates.city || updates.start_date) {
      const { generateEventSlug, getUniqueEventSlug } = await import(
        "@/lib/utils/event-slug"
      );
      const finalName = updates.name || event.name;
      const finalCity = updates.city || event.city;
      const finalDate = updates.start_date || event.start_date;
      const baseSlug = generateEventSlug(finalName, finalCity, finalDate);
      updates.slug = await getUniqueEventSlug(baseSlug, async (slug) => {
        const { data } = await supabase
          .from("events")
          .select("id")
          .eq("slug", slug)
          .neq("id", id)
          .maybeSingle();
        return !!data;
      });
    }

    // Пересчитываем capacity_remaining если изменились max_attendees
    if (updates.max_attendees !== undefined) {
      const { data: currentEvent } = await supabase
        .from("events")
        .select("attendees_count")
        .eq("id", id)
        .single();
      if (currentEvent) {
        updates.capacity_remaining = Math.max(
          0,
          (updates.max_attendees || 0) - (currentEvent.attendees_count || 0)
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Обновляем ивент
    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(id, twitter_handle, twitter_name, avatar_url),
        hub:hubs(id, name, image_url)
      `)
      .single();

    if (updateError) {
      console.error("Error updating event:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ event: updatedEvent }, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 * Удаление ивента
 * Только организатор может удалять
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

  // Проверяем, является ли пользователь организатором
  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("organizer_id")
    .eq("id", id)
    .single();

  if (fetchError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.organizer_id !== authUser.id) {
    return NextResponse.json(
      { error: "Only organizer can delete this event" },
      { status: 403 }
    );
  }

  // Удаляем ивент (каскадно удалятся event_members и event_speakers)
  const { error: deleteError } = await supabase
    .from("events")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Error deleting event:", deleteError);
    return NextResponse.json(
      { error: deleteError.message || "Failed to delete event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "Event deleted successfully" }, { status: 200 });
}

