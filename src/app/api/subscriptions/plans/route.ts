import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const getActivePlans = unstable_cache(
  async () => {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("interval_days", { ascending: true });

    if (error) throw error;
    return data || [];
  },
  ["plans-active"],
  { revalidate: 300, tags: ["plans"] }
);

export async function GET() {
  try {
    const plans = await getActivePlans();
    return NextResponse.json({ plans });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
