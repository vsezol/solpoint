import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    return NextResponse.json({
      session: {
        user: {
          id: user.id,
          email: user.email,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { session: null, error: error.message || "Failed to get session" },
      { status: 200 }
    );
  }
}
