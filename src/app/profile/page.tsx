import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();

  // Получаем текущего пользователя
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/login");
  }

  // Получаем профиль пользователя, чтобы узнать его username
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("twitter_handle")
    .eq("id", authUser.id)
    .single();

  if (profileError || !profile) {
    redirect("/");
  }

  // Редиректим на динамический роут с username пользователя
  redirect(`/profile/${profile.twitter_handle}`);
}
