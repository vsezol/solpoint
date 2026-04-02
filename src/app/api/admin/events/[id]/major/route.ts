import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }

  let isMajor: boolean;
  try {
    const body = await request.json();
    if (typeof body?.is_major !== "boolean") {
      return NextResponse.json(
        { error: "is_major must be a boolean" },
        { status: 400 }
      );
    }
    isMajor = body.is_major;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { data: updatedEvent, error } = await supabase
    .from("events")
    .update({ is_major: isMajor })
    .eq("id", eventId)
    .select("id, is_major")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ event: updatedEvent }, { status: 200 });
}
