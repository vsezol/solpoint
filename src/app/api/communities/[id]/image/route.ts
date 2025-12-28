import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isEntityOwner } from "@/lib/utils/entity-ownership";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

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

  // Проверяем, является ли пользователь владельцем комьюнити
  const isOwner = await isEntityOwner("community", id, authUser.id);
  if (!isOwner) {
    return NextResponse.json(
      { error: "Forbidden: You are not the owner of this community" },
      { status: 403 }
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
    const fileName = `${authUser.id}/${id}/${Date.now()}.${fileExt}`;

    // Загружаем файл в Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("community-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: uploadError.message || "Failed to upload image" },
        { status: 500 }
      );
    }

    // Получаем публичный URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("community-images").getPublicUrl(fileName);

    // Удаляем старое изображение, если оно есть
    const { data: community } = await supabase
      .from("communities")
      .select("image_url")
      .eq("id", id)
      .single();

    if (community?.image_url) {
      // Извлекаем путь из URL
      const urlParts = community.image_url.split("/community-images/");
      if (urlParts.length > 1) {
        const oldPath = urlParts[1].split("?")[0];
        if (oldPath && oldPath.startsWith(`${authUser.id}/${id}/`)) {
          await supabase.storage
            .from("community-images")
            .remove([oldPath]);
        }
      }
    }

    // Обновляем комьюнити с новым URL изображения
    const { error: updateError } = await supabase
      .from("communities")
      .update({ image_url: publicUrl })
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      // Удаляем загруженный файл при ошибке обновления
      await supabase.storage.from("community-images").remove([fileName]);
      return NextResponse.json(
        { error: "Failed to update community" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { image_url: publicUrl },
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

// DELETE для удаления изображения
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

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

  // Проверяем, является ли пользователь владельцем комьюнити
  const isOwner = await isEntityOwner("community", id, authUser.id);
  if (!isOwner) {
    return NextResponse.json(
      { error: "Forbidden: You are not the owner of this community" },
      { status: 403 }
    );
  }

  try {
    // Получаем текущее изображение
    const { data: community } = await supabase
      .from("communities")
      .select("image_url")
      .eq("id", id)
      .single();

    if (community?.image_url) {
      // Удаляем файл из Storage
      const urlParts = community.image_url.split("/community-images/");
      if (urlParts.length > 1) {
        const path = urlParts[1].split("?")[0];
        if (path && path.startsWith(`${authUser.id}/${id}/`)) {
          await supabase.storage.from("community-images").remove([path]);
        }
      }
    }

    // Обновляем комьюнити
    const { error: updateError } = await supabase
      .from("communities")
      .update({ image_url: null })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to delete image" },
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

