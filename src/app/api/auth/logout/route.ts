import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.set("Cache-Control", "no-store");

  response.cookies.delete("oauth_redirect_to");
  response.cookies.delete("oauth_flow_nonce");
  response.cookies.delete("oauth_provider_state");

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", {
        path: "/",
        expires: new Date(0),
      });
    }
  }

  return response;
}
