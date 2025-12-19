import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ user: null, profile: null });
  }

  // Получаем профиль пользователя
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ user: authUser, profile: null });
  }

  // Отладка: логируем что возвращается
  console.log("API /api/auth/me - profile data:", {
    id: profile.id,
    twitter_handle: profile.twitter_handle,
    is_admin: profile.is_admin,
    has_is_admin: 'is_admin' in profile,
    all_keys: Object.keys(profile),
  });

  return NextResponse.json({ user: authUser, profile });
}

