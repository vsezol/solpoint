import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
    const { bio, role, is_open_to_meet, country, city } = body;

    // Валидация
    const updates: {
      bio?: string;
      role?: string;
      is_open_to_meet?: boolean;
      country?: string;
      city?: string;
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

    // Валидация country
    if (country !== undefined) {
      if (typeof country !== "string") {
        return NextResponse.json(
          { error: "Country must be a string" },
          { status: 400 }
        );
      }
      if (country.length > 100) {
        return NextResponse.json(
          { error: "Country must be 100 characters or less" },
          { status: 400 }
        );
      }
      updates.country = country || null;
    }

    // Валидация city
    if (city !== undefined) {
      if (typeof city !== "string") {
        return NextResponse.json(
          { error: "City must be a string" },
          { status: 400 }
        );
      }
      if (city.length > 100) {
        return NextResponse.json(
          { error: "City must be 100 characters or less" },
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

