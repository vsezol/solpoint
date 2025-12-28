import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/profile/open-to-meet
 * Обновить поле is_open_to_meet для текущего пользователя
 * Body: { is_open_to_meet: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { is_open_to_meet } = await request.json();

    if (typeof is_open_to_meet !== "boolean") {
      return NextResponse.json(
        { error: "is_open_to_meet must be a boolean" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ is_open_to_meet })
      .eq("id", authUser.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating is_open_to_meet:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update is_open_to_meet" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: data });
  } catch (error: any) {
    console.error("Update open to meet error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update is_open_to_meet" },
      { status: 500 }
    );
  }
}

