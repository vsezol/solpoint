import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";

const getCountries = unstable_cache(
  async () => {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("countries")
      .select("code, name")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },
  ["countries-all"],
  { revalidate: 3600, tags: ["countries"] }
);

export async function GET() {
  try {
    const countries = await getCountries();
    return NextResponse.json({ countries });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get countries" },
      { status: 500 }
    );
  }
}
