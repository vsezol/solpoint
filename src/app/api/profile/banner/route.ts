import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Валидация типа файла
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Валидация размера (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    // Генерируем уникальное имя файла
    const fileExt = file.name.split(".").pop();
    const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;

    // Загружаем файл в Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("profile-banners")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false, // не перезаписываем существующие файлы
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: uploadError.message || "Failed to upload banner" },
        { status: 500 }
      );
    }

    // Получаем публичный URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-banners").getPublicUrl(fileName);

    // Удаляем старый баннер, если он есть
    const { data: profile } = await supabase
      .from("profiles")
      .select("banner_url")
      .eq("id", authUser.id)
      .single();

    if (profile?.banner_url) {
      // Извлекаем путь из URL
      const urlParts = profile.banner_url.split("/profile-banners/");
      if (urlParts.length > 1) {
        const oldPath = urlParts[1].split("?")[0]; // Убираем query параметры если есть
        if (oldPath && oldPath.startsWith(`${authUser.id}/`)) {
          await supabase.storage
            .from("profile-banners")
            .remove([oldPath]);
        }
      }
    }

    // Обновляем профиль с новым URL баннера
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ banner_url: publicUrl })
      .eq("id", authUser.id);

    if (updateError) {
      console.error("Update error:", updateError);
      // Удаляем загруженный файл при ошибке обновления
      await supabase.storage.from("profile-banners").remove([fileName]);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { banner_url: publicUrl },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE для удаления баннера
export async function DELETE(request: Request) {
  const supabase = await createClient();

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
    // Получаем текущий баннер
    const { data: profile } = await supabase
      .from("profiles")
      .select("banner_url")
      .eq("id", authUser.id)
      .single();

    if (profile?.banner_url) {
      // Удаляем файл из Storage
      const urlParts = profile.banner_url.split("/profile-banners/");
      if (urlParts.length > 1) {
        const path = urlParts[1].split("?")[0]; // Убираем query параметры если есть
        if (path && path.startsWith(`${authUser.id}/`)) {
          await supabase.storage.from("profile-banners").remove([path]);
        }
      }
    }

    // Обновляем профиль
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ banner_url: null })
      .eq("id", authUser.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to delete banner" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

