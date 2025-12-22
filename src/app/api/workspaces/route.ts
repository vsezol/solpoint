import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/workspaces
 * Список workspaces с фильтрами
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("workspaces")
    .select("*")
    .order("members_count", { ascending: false });

  const countryCode = searchParams.get("country_code");
  if (countryCode) {
    query = query.eq("country_code", countryCode.toUpperCase());
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
      `name.ilike.%${search}%,country.ilike.%${search}%,city.ilike.%${search}%,description.ilike.%${search}%,address.ilike.%${search}%`
    );
  }

  const limit = parseInt(searchParams.get("limit") || "500", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  query = query.range(offset, offset + limit - 1);

  const { data: workspaces, error } = await query;

  if (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch workspaces" },
      { status: 500 }
    );
  }

  return NextResponse.json({ workspaces: workspaces || [] }, { status: 200 });
}

/**
 * POST /api/workspaces
 * Создать новый workspace
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

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
      address,
      latitude,
      longitude,
      socials,
    } = body;

    if (!name || !address) {
      return NextResponse.json(
        { error: "Missing required fields: name, address" },
        { status: 400 }
      );
    }

    const hasLocation = country !== undefined && country !== null;
    const hasCity = city !== undefined && city !== null && city.trim() !== "";
    const hasCoordinates = latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null;
    
    if (hasLocation && hasCity && (!hasCoordinates)) {
      return NextResponse.json(
        { error: "If city is specified, latitude and longitude are required" },
        { status: 400 }
      );
    }

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({
        name,
        description,
        image_url,
        slug,
        country: hasLocation ? country : null,
        country_code: hasLocation ? (country_code || null) : null,
        city: hasLocation ? (city || null) : null,
        address: address, // Обязательно
        latitude: hasLocation && hasCoordinates ? parseFloat(latitude) : 0,
        longitude: hasLocation && hasCoordinates ? parseFloat(longitude) : 0,
        socials: socials || {},
        owner_id: user.id, // Устанавливаем owner_id из текущего пользователя
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating workspace:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create workspace" },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error("Error parsing request:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

