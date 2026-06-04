import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const SESSION_COOKIE_NAME = "sp_visit_sid";
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

type VisitPayload = {
  path?: string;
  referrer?: string | null;
};

function sanitizePath(input: string | undefined): string {
  if (!input) return "/";
  const value = input.trim();
  if (!value.startsWith("/")) return "/";
  return value.slice(0, 1024);
}

function sanitizeReferrer(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;
  return value.slice(0, 1024);
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const requestHeaders = await headers();
    const payload = (await request.json().catch(() => ({}))) as VisitPayload;

    const path = sanitizePath(payload.path);
    const referrer = sanitizeReferrer(payload.referrer);
    const userAgent = sanitizeReferrer(requestHeaders.get("user-agent"));

    let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const isNewSessionId = !sessionId;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const serviceRoleClient = createServiceRoleClient() as any;
    const { data: existing, error: selectError } = await serviceRoleClient
      .from("site_visit_sessions")
      .select("session_id, page_views, registered_user_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json(
        { error: selectError.message || "Failed to read visit session" },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    if (!existing) {
      const { error: insertError } = await serviceRoleClient.from("site_visit_sessions").insert({
        session_id: sessionId,
        registered_user_id: user?.id || null,
        first_seen_at: now,
        last_seen_at: now,
        page_views: 1,
        last_path: path,
        referrer,
        user_agent: userAgent,
        updated_at: now,
      });

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message || "Failed to create visit session" },
          { status: 500 }
        );
      }
    } else {
      const registeredUserId = existing.registered_user_id || user?.id || null;
      const { error: updateError } = await serviceRoleClient
        .from("site_visit_sessions")
        .update({
          registered_user_id: registeredUserId,
          page_views: (existing.page_views || 0) + 1,
          last_seen_at: now,
          last_path: path,
          referrer,
          user_agent: userAgent,
          updated_at: now,
        })
        .eq("session_id", sessionId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "Failed to update visit session" },
          { status: 500 }
        );
      }
    }

    const response = NextResponse.json({ ok: true });
    if (isNewSessionId) {
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: sessionId,
        maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process visit session",
      },
      { status: 500 }
    );
  }
}
