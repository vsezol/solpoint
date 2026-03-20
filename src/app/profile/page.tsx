import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface ProfilePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const supabase = await createClient();
  const params = await searchParams;

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
  const nextParams = new URLSearchParams();
  const meetingRequests = params.meetingRequests;
  if (meetingRequests === "1" || (Array.isArray(meetingRequests) && meetingRequests[0] === "1")) {
    nextParams.set("meetingRequests", "1");
  }

  const queryString = nextParams.toString();
  redirect(`/profile/${profile.twitter_handle}${queryString ? `?${queryString}` : ""}`);
}
