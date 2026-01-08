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
    const { bio, role, is_open_to_meet, country, country_code, city, socials } = body;

    // Валидация
    const updates: {
      bio?: string | null;
      role?: string;
      is_open_to_meet?: boolean;
      country?: string | null;
      country_code?: string | null;
      city?: string | null;
      socials?: {
        twitter?: string | null;
        instagram?: string | null;
        facebook?: string | null;
        telegram?: string | null;
        youtube?: string | null;
        discord?: string | null;
        github?: string | null;
        linkedin?: string | null;
        medium?: string | null;
        substack?: string | null;
      } | null;
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

    // Валидация socials
    if (socials !== undefined) {
      if (socials !== null && typeof socials !== "object") {
        return NextResponse.json(
          { error: "Socials must be an object" },
          { status: 400 }
        );
      }
      
      if (socials) {
        const socialsObj: {
          twitter?: string | null;
          instagram?: string | null;
          facebook?: string | null;
          telegram?: string | null;
          youtube?: string | null;
          discord?: string | null;
          github?: string | null;
          linkedin?: string | null;
          medium?: string | null;
          substack?: string | null;
        } = {};
        
        // Валидация twitter (оставляем для обратной совместимости, но не обновляем)
        if (socials.twitter !== undefined) {
          if (socials.twitter !== null && typeof socials.twitter !== "string") {
            return NextResponse.json(
              { error: "Twitter URL must be a string" },
              { status: 400 }
            );
          }
          // Twitter автоматически генерируется из twitter_handle, поэтому не сохраняем
        }
        
        // Валидация instagram
        if (socials.instagram !== undefined) {
          if (socials.instagram !== null && typeof socials.instagram !== "string") {
            return NextResponse.json(
              { error: "Instagram URL must be a string" },
              { status: 400 }
            );
          }
          socialsObj.instagram = socials.instagram?.trim() || null;
        }
        
        // Валидация facebook
        if (socials.facebook !== undefined) {
          if (socials.facebook !== null && typeof socials.facebook !== "string") {
            return NextResponse.json(
              { error: "Facebook URL must be a string" },
              { status: 400 }
            );
          }
          socialsObj.facebook = socials.facebook?.trim() || null;
        }
        
        // Валидация telegram
        if (socials.telegram !== undefined) {
          if (socials.telegram !== null && typeof socials.telegram !== "string") {
            return NextResponse.json(
              { error: "Telegram URL must be a string" },
              { status: 400 }
            );
          }
          socialsObj.telegram = socials.telegram?.trim() || null;
        }
        
        // Валидация youtube
        if (socials.youtube !== undefined) {
          if (socials.youtube !== null && typeof socials.youtube !== "string") {
            return NextResponse.json(
              { error: "YouTube URL must be a string" },
              { status: 400 }
            );
          }
          socialsObj.youtube = socials.youtube?.trim() || null;
        }
        
        // Валидация discord
        if (socials.discord !== undefined) {
          if (socials.discord !== null && typeof socials.discord !== "string") {
            return NextResponse.json(
              { error: "Discord URL must be a string" },
              { status: 400 }
            );
          }
          socialsObj.discord = socials.discord?.trim() || null;
        }
        
        // Валидация github
        if (socials.github !== undefined) {
          if (socials.github !== null && typeof socials.github !== "string") {
            return NextResponse.json(
              { error: "GitHub URL must be a string" },
              { status: 400 }
            );
          }
          socialsObj.github = socials.github?.trim() || null;
        }
        
        // Валидация linkedin
        if (socials.linkedin !== undefined) {
          if (socials.linkedin !== null && typeof socials.linkedin !== "string") {
            return NextResponse.json(
              { error: "LinkedIn URL must be a string" },
              { status: 400 }
            );
          }
          socialsObj.linkedin = socials.linkedin?.trim() || null;
        }
        
        // Валидация medium
        if (socials.medium !== undefined) {
          if (socials.medium !== null && typeof socials.medium !== "string") {
            return NextResponse.json(
              { error: "Medium URL must be a string" },
              { status: 400 }
            );
          }
          socialsObj.medium = socials.medium?.trim() || null;
        }
        
        // Валидация substack
        if (socials.substack !== undefined) {
          if (socials.substack !== null && typeof socials.substack !== "string") {
            return NextResponse.json(
              { error: "Substack URL must be a string" },
              { status: 400 }
            );
          }
          socialsObj.substack = socials.substack?.trim() || null;
        }
        
        // Если есть поля для обновления, получаем текущие socials и twitter_handle из профиля
        if (Object.keys(socialsObj).length > 0) {
          const { data: currentProfile } = await supabase
            .from("profiles")
            .select("socials, twitter_handle")
            .eq("id", authUser.id)
            .single();
          
          const currentSocials = (currentProfile?.socials as typeof socialsObj) || {};
          
          // Объединяем текущие и новые socials
          // Twitter всегда генерируется автоматически из twitter_handle
          updates.socials = {
            ...currentSocials,
            ...socialsObj,
            // Twitter автоматически генерируется из twitter_handle, не сохраняем вручную
            twitter: currentProfile?.twitter_handle 
              ? `https://twitter.com/${currentProfile.twitter_handle}` 
              : null,
          };
        }
        // Если socialsObj пустой, не обновляем socials
      } else {
        // Если socials передан как null, устанавливаем пустой объект (база данных не поддерживает null для JSONB)
        updates.socials = {};
      }
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

