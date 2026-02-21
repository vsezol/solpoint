import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ hasEntities: false });
  }

  const userId = authUser.id;

  // Проверяем наличие хотя бы одной сущности параллельно
  // Используем простой SELECT с limit(1) для максимальной производительности
  const [
    { data: eventsData },
    { data: hubsData },
    { data: communitiesData },
    { data: projectsData },
    { data: workspacesData },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id")
      .eq("owner_type", "user")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("hubs")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("communities")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle(),
  ]);

  const hasEntities =
    !!eventsData ||
    !!hubsData ||
    !!communitiesData ||
    !!projectsData ||
    !!workspacesData;

  return NextResponse.json({ hasEntities });
}



