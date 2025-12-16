import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidCountryCode, normalizeCountryCode } from "@/lib/countries";

export async function PATCH(request: Request) {
  const supabase = await createClient();

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { bio, role, is_open_to_meet, country, country_code, city } = body;

    // Валидация
    const updates: {
      bio?: string | null;
      role?: string;
      is_open_to_meet?: boolean;
      country?: string | null;
      country_code?: string | null;
      city?: string | null;
    } = {};

    // Валидация bio
    if (bio !== undefined) {
      if (typeof bio !== "string") {
        return NextResponse.json(
          { error: "Bio must be a string" },
          { status: 400 }
        );
      }
      if (bio.length > 150) {
        return NextResponse.json(
          { error: "Bio must be 150 characters or less" },
          { status: 400 }
        );
      }
      updates.bio = bio || null; // Пустая строка становится null
    }

    // Валидация role
    if (role !== undefined) {
      const validRoles = [
        "degen",
        "developer",
        "trader",
        "investor",
        "designer",
        "founder",
        "other",
      ];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: "Invalid role" },
          { status: 400 }
        );
      }
      updates.role = role;
    }

    // Валидация is_open_to_meet
    if (is_open_to_meet !== undefined) {
      if (typeof is_open_to_meet !== "boolean") {
        return NextResponse.json(
          { error: "is_open_to_meet must be a boolean" },
          { status: 400 }
        );
      }
      updates.is_open_to_meet = is_open_to_meet;
    }

    // Валидация country (deprecated, но оставляем для обратной совместимости)
    if (country !== undefined) {
      if (country !== null && typeof country !== "string") {
        return NextResponse.json(
          { error: "Country must be a string" },
          { status: 400 }
        );
      }
      if (country && country.length > 100) {
        return NextResponse.json(
          { error: "Country must be 100 characters or less" },
          { status: 400 }
        );
      }
      updates.country = country || null;
    }

    // Валидация country_code
    if (country_code !== undefined) {
      if (country_code !== null && typeof country_code !== "string") {
        return NextResponse.json(
          { error: "Country code must be a string" },
          { status: 400 }
        );
      }
      
      if (country_code) {
        // Нормализуем код страны (приводим к uppercase)
        const normalizedCode = normalizeCountryCode(country_code);
        
        // Проверяем формат (2 символа, uppercase)
        if (!isValidCountryCode(normalizedCode)) {
          return NextResponse.json(
            { error: "Country code must be 2 uppercase letters (ISO 3166-1 alpha-2)" },
            { status: 400 }
          );
        }
        
        updates.country_code = normalizedCode;
      } else {
        updates.country_code = null;
      }
    }

    // Валидация city
    if (city !== undefined) {
      if (city !== null && typeof city !== "string") {
        return NextResponse.json(
          { error: "City must be a string" },
          { status: 400 }
        );
      }
      if (city && city.length > 150) {
        return NextResponse.json(
          { error: "City must be 150 characters or less" },
          { status: 400 }
        );
      }
      updates.city = city || null;
    }

    // Если нет полей для обновления
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Обновляем профиль
    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", authUser.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

