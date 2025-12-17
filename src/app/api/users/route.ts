import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/users
 * Список пользователей с фильтрами для карты
 * 
 * Query params:
 * - country: фильтр по стране
 * - country_code: фильтр по коду страны (ISO 3166-1 alpha-2)
 * - city: фильтр по городу
 * - role: фильтр по роли (developer, trader, investor, designer, founder, degen, other)
 * - open_to_meet: true - только открытые к встречам
 * - active_only: true - только активные (за последние 30 дней)
 * - limit: количество результатов (по умолчанию 1000)
 * - offset: смещение для пагинации
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // Строим запрос
  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

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

  const role = searchParams.get("role");
  if (role) {
    query = query.eq("role", role);
  }

  const roles = searchParams.get("roles");
  if (roles) {
    const rolesArray = roles.split(",");
    query = query.in("role", rolesArray);
  }

  const openToMeet = searchParams.get("open_to_meet");
  if (openToMeet === "true") {
    query = query.eq("is_open_to_meet", true);
  }

  const activeOnly = searchParams.get("active_only");
  if (activeOnly === "true") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query = query.gte("last_active_at", thirtyDaysAgo.toISOString());
  }

  // Пагинация
  const limit = parseInt(searchParams.get("limit") || "1000", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  query = query.range(offset, offset + limit - 1);

  const { data: users, error } = await query;

  if (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }

  return NextResponse.json({ users: users || [] }, { status: 200 });
}

