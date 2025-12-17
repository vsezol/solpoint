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

