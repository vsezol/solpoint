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

  // Проверяем, есть ли у пользователя хотя бы одна сущность, которой он владеет
  const userId = authUser.id;
  
  // Проверяем events (где owner_type = 'user' AND owner_id = userId)
  const { count: eventsCount } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("owner_type", "user")
    .eq("owner_id", userId)
    .limit(1);

  // Проверяем hubs
  const { count: hubsCount } = await supabase
    .from("hubs")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)
    .limit(1);

  // Проверяем communities
  const { count: communitiesCount } = await supabase
    .from("communities")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)
    .limit(1);

  // Проверяем projects
  const { count: projectsCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)
    .limit(1);

  // Проверяем workspaces
  const { count: workspacesCount } = await supabase
    .from("workspaces")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)
    .limit(1);

  // Если есть хотя бы одна сущность, включаем Dashboard
  const enableDashboard = 
    (eventsCount && eventsCount > 0) ||
    (hubsCount && hubsCount > 0) ||
    (communitiesCount && communitiesCount > 0) ||
    (projectsCount && projectsCount > 0) ||
    (workspacesCount && workspacesCount > 0);

  // Добавляем поле enable_dashboard в профиль
  const profileWithDashboard = {
    ...profile,
    enable_dashboard: enableDashboard,
  };

  return NextResponse.json({ user: authUser, profile: profileWithDashboard });
}
