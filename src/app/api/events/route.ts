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

  const { data: { user: authUser } } = await supabase.auth.getUser();

  const visibility = searchParams.get("visibility");
  let isVip = false;
  if (authUser && (visibility === "vip_only" || !visibility)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", authUser.id)
      .single();
    isVip = profile?.subscription_tier === "vip";
  }

  let query = supabase
    .from("events")
    .select("*")
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

  const isRecommended = searchParams.get("is_recommended");
  if (isRecommended !== null) {
    query = query.eq("is_recommended", isRecommended === "true");
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

  const eventsWithSource = (events || []).map((event) => ({
    ...event,
    source: event.luma_event_id ? ("external" as const) : ("solpoint" as const),
  }));

  return NextResponse.json({ events: eventsWithSource }, { status: 200 });
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
      luma_link,
      contacts,
      hub_id,
      community_id,
      project_id,
    } = body;

    // Валидация обязательных полей
    if (!name || !start_date || !luma_link) {
      return NextResponse.json(
        { error: "Missing required fields: name, start_date, luma_link" },
        { status: 400 }
      );
    }

    // Если указана локация, все поля локации должны быть заполнены
    // Если локация не указана (глобальное событие), все поля локации должны быть null
    const hasLocation = country !== undefined && country !== null;
    const hasCoordinates = latitude !== undefined && longitude !== undefined;
    
    if (hasLocation && (!hasCoordinates || latitude === null || longitude === null)) {
      return NextResponse.json(
        { error: "If country is specified, latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Определяем owner_type и owner_id
    let ownerType: "user" | "hub" | "community" | "project" = "user";
    let ownerId: string = authUser.id;

    // Валидация: если указан hub_id, community_id или project_id, проверяем что пользователь является владельцем
    if (hub_id) {
      const { data: hub, error: hubError } = await supabase
        .from("hubs")
        .select("owner_id")
        .eq("id", hub_id)
        .single();

      if (hubError || !hub) {
        return NextResponse.json(
          { error: "Hub not found" },
          { status: 404 }
        );
      }

      if (hub.owner_id !== authUser.id) {
        return NextResponse.json(
          { error: "You are not the owner of this hub" },
          { status: 403 }
        );
      }

      ownerType = "hub";
      ownerId = hub_id;
    } else if (community_id) {
      const { data: community, error: communityError } = await supabase
        .from("communities")
        .select("owner_id")
        .eq("id", community_id)
        .single();

      if (communityError || !community) {
        return NextResponse.json(
          { error: "Community not found" },
          { status: 404 }
        );
      }

      if (community.owner_id !== authUser.id) {
        return NextResponse.json(
          { error: "You are not the owner of this community" },
          { status: 403 }
        );
      }

      ownerType = "community";
      ownerId = community_id;
    } else if (project_id) {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("owner_id")
        .eq("id", project_id)
        .single();

      if (projectError || !project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      if (project.owner_id !== authUser.id) {
        return NextResponse.json(
          { error: "You are not the owner of this project" },
          { status: 403 }
        );
      }

      ownerType = "project";
      ownerId = project_id;
    }

    // Генерация slug
    const { generateEventSlug, getUniqueEventSlug } = await import(
      "@/lib/utils/event-slug"
    );
    const baseSlug = generateEventSlug(name, city || "global", start_date);
    
    // Проверяем уникальность slug
    const { getUniqueSlug } = await import("@/lib/utils/event-slug");
    const slug = await getUniqueSlug(baseSlug, async (slug) => {
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
      country: hasLocation ? country : null,
      country_code: hasLocation ? (country_code || null) : null,
      city: hasLocation ? (city || null) : null,
      address: hasLocation ? (address || null) : null,
      venue_name: venue_name || null,
      latitude: hasLocation ? parseFloat(latitude) : null,
      longitude: hasLocation ? parseFloat(longitude) : null,
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
      luma_link: luma_link,
      contacts: contacts || {},
      // Унифицированные поля
      owner_type: ownerType,
      owner_id: ownerId,
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
      .select("*")
      .single();

    if (createError) {
      console.error("Error creating event:", createError);
      return NextResponse.json(
        { error: createError.message || "Failed to create event" },
        { status: 500 }
      );
    }

    // При создании через наш API добавляем владельца в event_organizers
    if (ownerType === "user" && event?.id) {
      await supabase.from("event_organizers").insert({
        event_id: event.id,
        profile_id: ownerId,
        position: 0,
      });
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

