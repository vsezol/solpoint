import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/events
 * Список ивентов с фильтрами
 * 
 * Query params:
 * - country: фильтр по стране
 * - city: фильтр по городу
 * - event_type: official | community | private | meetup
 * - visibility: public | vip_only
 * - is_online: true | false
 * - is_paid: true | false
 * - upcoming: true - только предстоящие
 * - limit: количество результатов (по умолчанию 50)
 * - offset: смещение для пагинации
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // Проверяем аутентификацию для VIP ивентов
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Получаем профиль для проверки VIP статуса
  let isVip = false;
  if (authUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", authUser.id)
      .single();
    isVip = profile?.subscription_tier === "vip";
  }

  // Строим запрос
  let query = supabase
    .from("events")
    .select(`
      *,
      organizer:profiles!events_organizer_id_fkey(id, twitter_handle, twitter_name, avatar_url),
      hub:hubs(id, name, image_url)
    `)
    .order("start_date", { ascending: true });

  // Фильтры по стране (приоритет country_code, fallback на country для обратной совместимости)
  const countryCode = searchParams.get("country_code");
  if (countryCode) {
    // Приоритет: фильтр по коду страны (ISO 3166-1 alpha-2)
    query = query.eq("country_code", countryCode.toUpperCase());
  } else {
    // Fallback: фильтр по названию страны (для обратной совместимости)
    const country = searchParams.get("country");
    if (country) {
      query = query.eq("country", country);
    }
  }

  const city = searchParams.get("city");
  if (city) {
    query = query.eq("city", city);
  }

  const eventType = searchParams.get("event_type");
  if (eventType) {
    query = query.eq("event_type", eventType);
  }

  const visibility = searchParams.get("visibility");
  if (visibility) {
    query = query.eq("visibility", visibility);
  } else if (!isVip) {
    // Если не VIP, показываем только публичные
    query = query.eq("visibility", "public");
  }

  const isOnline = searchParams.get("is_online");
  if (isOnline !== null) {
    query = query.eq("is_online", isOnline === "true");
  }

  const isPaid = searchParams.get("is_paid");
  if (isPaid !== null) {
    query = query.eq("is_paid", isPaid === "true");
  }

  // Только предстоящие ивенты
  const upcoming = searchParams.get("upcoming");
  if (upcoming === "true") {
    query = query.gte("start_date", new Date().toISOString());
  }

  // Пагинация
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  query = query.range(offset, offset + limit - 1);

  const { data: events, error } = await query;

  if (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }

  return NextResponse.json({ events: events || [] }, { status: 200 });
}

/**
 * POST /api/events
 * Создание нового ивента
 * Требует аутентификации
 */
export async function POST(request: Request) {
  const supabase = await createClient();

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
    const {
      name,
      description,
      image_url,
      country,
      country_code,
      city,
      address,
      venue_name,
      latitude,
      longitude,
      start_date,
      end_date,
      timezone,
      event_type,
      visibility,
      is_paid,
      price_sol,
      price_usd,
      max_attendees,
      registration_deadline,
      is_online,
      socials,
      contacts,
      hub_id,
    } = body;

    // Валидация обязательных полей
    if (!name || !country || !city || !latitude || !longitude || !start_date) {
      return NextResponse.json(
        { error: "Missing required fields: name, country, city, latitude, longitude, start_date" },
        { status: 400 }
      );
    }

    // Генерация slug
    const { generateEventSlug, getUniqueEventSlug } = await import(
      "@/lib/utils/event-slug"
    );
    const baseSlug = generateEventSlug(name, city, start_date);
    
    // Проверяем уникальность slug
    const slug = await getUniqueEventSlug(baseSlug, async (slug) => {
      const { data } = await supabase
        .from("events")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      return !!data;
    });

    // Подготовка данных для вставки
    const eventData: any = {
      name,
      description: description || null,
      image_url: image_url || null,
      slug,
      country,
      country_code: country_code || null,
      city,
      address: address || null,
      venue_name: venue_name || null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      start_date: new Date(start_date).toISOString(),
      end_date: end_date ? new Date(end_date).toISOString() : null,
      timezone: timezone || null,
      event_type: event_type || "community",
      visibility: visibility || "public",
      is_paid: is_paid || false,
      price_sol: price_sol ? parseFloat(price_sol) : null,
      price_usd: price_usd ? parseFloat(price_usd) : null,
      max_attendees: max_attendees ? parseInt(max_attendees, 10) : null,
      registration_deadline: registration_deadline
        ? new Date(registration_deadline).toISOString()
        : null,
      is_online: is_online || false,
      socials: socials || {},
      contacts: contacts || {},
      organizer_id: authUser.id,
      hub_id: hub_id || null,
      attendees_count: 0,
    };

    // Вычисляем capacity_remaining
    if (eventData.max_attendees) {
      eventData.capacity_remaining = eventData.max_attendees;
    }

    // Создаем ивент
    const { data: event, error: createError } = await supabase
      .from("events")
      .insert(eventData)
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(id, twitter_handle, twitter_name, avatar_url),
        hub:hubs(id, name, image_url)
      `)
      .single();

    if (createError) {
      console.error("Error creating event:", createError);
      return NextResponse.json(
        { error: createError.message || "Failed to create event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

