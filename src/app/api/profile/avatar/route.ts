import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message || "Failed to upload avatar" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-avatars").getPublicUrl(fileName);

    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", authUser.id)
      .single();

    if (profile?.avatar_url) {
      const urlParts = profile.avatar_url.split("/profile-avatars/");
      if (urlParts.length > 1) {
        const oldPath = urlParts[1].split("?")[0];
        if (oldPath && oldPath.startsWith(`${authUser.id}/`)) {
          await supabase.storage.from("profile-avatars").remove([oldPath]);
        }
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", authUser.id);

    if (updateError) {
      await supabase.storage.from("profile-avatars").remove([fileName]);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ avatar_url: publicUrl }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

