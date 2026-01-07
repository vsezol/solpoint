import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateSlug, getUniqueSlug } from "@/lib/utils/event-slug";

/**
 * GET /api/projects
 * Список проектов с фильтрами для карты
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
    .from("projects")
    .select("*")
    .order("is_recommended", { ascending: false })
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

  const { data: projects, error } = await query;

  if (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch projects" },
      { status: 500 }
    );
  }

  return NextResponse.json({ projects: projects || [] }, { status: 200 });
}

/**
 * POST /api/projects
 * Создать новый проект
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
    // Если локация не указана (глобальный проект), все поля локации должны быть null
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

    // Генерируем slug из name, если slug не указан
    let finalSlug = slug;
    if (!finalSlug || finalSlug.trim() === "") {
      const baseSlug = generateSlug(name);
      finalSlug = await getUniqueSlug(baseSlug, async (checkSlug) => {
        const { data } = await supabase
          .from("projects")
          .select("id")
          .eq("slug", checkSlug)
          .maybeSingle();
        return !!data;
      });
    }

    // Создаем проект
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        name,
        description,
        image_url,
        slug: finalSlug,
        country: hasLocation ? country : null,
        country_code: hasLocation ? (country_code || null) : null,
        city: hasLocation ? city : null,
        latitude: hasLocation && hasCoordinates ? latitude : null,
        longitude: hasLocation && hasCoordinates ? longitude : null,
        socials: socials || {},
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Error parsing request:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

