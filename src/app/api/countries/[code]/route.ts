import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";

const getCountryByCode = unstable_cache(
  async (code: string) => {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("countries")
      .select("code, name")
      .eq("code", code)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  },
  ["country-by-code"],
  { revalidate: 3600, tags: ["countries"] }
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length !== 2) {
      return NextResponse.json(
        { error: "Invalid country code. Must be 2 characters." },
        { status: 400 }
      );
    }

    const country = await getCountryByCode(code.toUpperCase());

    if (!country) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    return NextResponse.json({ country });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get country" },
      { status: 500 }
    );
  }
}
