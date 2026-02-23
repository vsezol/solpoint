import { createClient } from "@/lib/supabase/server";
import { authDebugLog } from "@/lib/auth/debug";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    authDebugLog("session", "session_lookup", {
      user_id: user?.id ?? null,
    });

    if (!user) {
      authDebugLog("session", "response_no_session");
      return NextResponse.json({ session: null }, { status: 200 });
    }

    authDebugLog("session", "response_with_session", {
      user_id: user.id,
      has_email: Boolean(user.email),
    });
    return NextResponse.json({
      session: {
        user: {
          id: user.id,
          email: user.email,
        },
      },
    });
  } catch (error: any) {
    authDebugLog("session", "session_lookup_failed", {
      error_message: error?.message || "Failed to get session",
    });
    return NextResponse.json(
      { session: null, error: error.message || "Failed to get session" },
      { status: 200 }
    );
  }
}
