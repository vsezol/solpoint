import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/communities
 * Список комьюнити с фильтрами для карты
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
    .from("communities")
    .select("*")
    .order("members_count", { ascending: false });

  // Фильтры по стране
  const countryCode = searchParams.get("country_code");
  if (countryCode) {
    query = query.eq("country", countryCode.toUpperCase());
  } else {
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

  const { data: communities, error } = await query;

  if (error) {
    console.error("Error fetching communities:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch communities" },
      { status: 500 }
    );
  }

  return NextResponse.json({ communities: communities || [] }, { status: 200 });
}

/**
 * POST /api/communities
 * Создать новое комьюнити
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
      city,
      latitude,
      longitude,
      socials,
    } = body;

    // Валидация обязательных полей
    if (!name || !country || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, country, latitude, longitude" },
        { status: 400 }
      );
    }

    // Создаем комьюнити
    const { data: community, error } = await supabase
      .from("communities")
      .insert({
        name,
        description,
        image_url,
        slug,
        country,
        city,
        latitude,
        longitude,
        socials: socials || {},
        creator_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating community:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create community" },
        { status: 500 }
      );
    }

    return NextResponse.json({ community }, { status: 201 });
  } catch (error) {
    console.error("Error parsing request:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

