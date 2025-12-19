import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/hubs
 * Список хабов с фильтрами для карты
 * 
 * Query params:
 * - country: фильтр по стране
 * - country_code: фильтр по коду страны (ISO 3166-1 alpha-2)
 * - city: фильтр по городу
 * - search: поиск по названию, стране, городу
 * - limit: количество результатов (по умолчанию 500)
 * - offset: смещение для пагинации
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // Строим запрос
  let query = supabase
    .from("hubs")
    .select("*")
    .order("members_count", { ascending: false });

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
    query = query.ilike("city", `%${city}%`);
  }

  const search = searchParams.get("search");
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,country.ilike.%${search}%,city.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  // Пагинация
  const limit = parseInt(searchParams.get("limit") || "500", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  query = query.range(offset, offset + limit - 1);

  const { data: hubs, error } = await query;

  if (error) {
    console.error("Error fetching hubs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch hubs" },
      { status: 500 }
    );
  }

  return NextResponse.json({ hubs: hubs || [] }, { status: 200 });
}

/**
 * POST /api/hubs
 * Создать новый хаб
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Проверка авторизации
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      image_url,
      slug,
      country,
      country_code,
      city,
      latitude,
      longitude,
      socials,
    } = body;

    // Валидация обязательных полей
    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    // Если указана локация, проверяем требования
    // Если локация не указана (глобальный хаб), все поля локации должны быть null
    const hasLocation = country !== undefined && country !== null;
    const hasCity = city !== undefined && city !== null && city.trim() !== "";
    const hasCoordinates = latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null;
    
    // Если указан город, координаты обязательны
    // Если указана только страна, координаты опциональны
    if (hasLocation && hasCity && (!hasCoordinates)) {
      return NextResponse.json(
        { error: "If city is specified, latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Создаем хаб
    const { data: hub, error } = await supabase
      .from("hubs")
      .insert({
        name,
        description,
        image_url,
        slug,
        country: hasLocation ? country : null,
        country_code: hasLocation ? (country_code || null) : null,
        city: hasLocation ? (city || null) : null,
        latitude: hasLocation && hasCoordinates ? parseFloat(latitude) : null,
        longitude: hasLocation && hasCoordinates ? parseFloat(longitude) : null,
        socials: socials || {},
        creator_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating hub:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create hub" },
        { status: 500 }
      );
    }

    return NextResponse.json({ hub }, { status: 201 });
  } catch (error) {
    console.error("Error parsing request:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

