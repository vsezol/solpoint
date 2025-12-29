import { createClient } from "@/lib/supabase/server";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";
import { NextResponse } from "next/server";
import { isEntityOwner } from "@/lib/utils/entity-ownership";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const supabase = await createClient();
  const { identifier } = await params;
  // Преобразуем identifier в ID
  
  const workspaceId = await getEntityIdByIdentifier("workspace", identifier);
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace not found" },
      { status: 404 }
    );
  }

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

  // Проверяем, является ли пользователь владельцем воркспейса
  const isOwner = await isEntityOwner("workspace", workspaceId, authUser.id);
  if (!isOwner) {
    return NextResponse.json(
      { error: "Forbidden: You are not the owner of this workspace" },
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
    const fileName = `${authUser.id}/${workspaceId}/${Date.now()}.${fileExt}`;

    // Загружаем файл в Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("workspace-images")
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
    } = supabase.storage.from("workspace-images").getPublicUrl(fileName);

    // Удаляем старое изображение, если оно есть
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("image_url")
      .eq("id", workspaceId)
      .single();

    if (workspace?.image_url) {
      // Извлекаем путь из URL
      const urlParts = workspace.image_url.split("/workspace-images/");
      if (urlParts.length > 1) {
        const oldPath = urlParts[1].split("?")[0];
        if (oldPath && oldPath.startsWith(`${authUser.id}/${workspaceId}/`)) {
          await supabase.storage
            .from("workspace-images")
            .remove([oldPath]);
        }
      }
    }

    // Обновляем воркспейс с новым URL изображения
    const { error: updateError } = await supabase
      .from("workspaces")
      .update({ image_url: publicUrl })
      .eq("id", workspaceId);

    if (updateError) {
      console.error("Update error:", updateError);
      // Удаляем загруженный файл при ошибке обновления
      await supabase.storage.from("workspace-images").remove([fileName]);
      return NextResponse.json(
        { error: "Failed to update workspace" },
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
  { params }: { params: Promise<{ identifier: string }> }
) {
  const supabase = await createClient();
  const { identifier } = await params;
  // Преобразуем identifier в ID
  
  const workspaceId = await getEntityIdByIdentifier("workspace", identifier);
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace not found" },
      { status: 404 }
    );
  }

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

  // Проверяем, является ли пользователь владельцем воркспейса
  const isOwner = await isEntityOwner("workspace", workspaceId, authUser.id);
  if (!isOwner) {
    return NextResponse.json(
      { error: "Forbidden: You are not the owner of this workspace" },
      { status: 403 }
    );
  }

  try {
    // Получаем текущее изображение
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("image_url")
      .eq("id", workspaceId)
      .single();

    if (workspace?.image_url) {
      // Удаляем файл из Storage
      const urlParts = workspace.image_url.split("/workspace-images/");
      if (urlParts.length > 1) {
        const path = urlParts[1].split("?")[0];
        if (path && path.startsWith(`${authUser.id}/${workspaceId}/`)) {
          await supabase.storage.from("workspace-images").remove([path]);
        }
      }
    }

    // Обновляем воркспейс
    const { error: updateError } = await supabase
      .from("workspaces")
      .update({ image_url: null })
      .eq("id", workspaceId);

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

