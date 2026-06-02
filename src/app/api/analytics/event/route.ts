import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const SESSION_COOKIE_NAME = "sp_visit_sid";
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

type EventLevel = "info" | "warn" | "error";

type AnalyticsEventPayload = {
  event_name?: string;
  event_level?: EventLevel;
  page_path?: string;
  payload?: Record<string, unknown>;
};

function normalizeEventName(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}

function normalizeEventLevel(value: EventLevel | undefined): EventLevel {
  if (value === "warn" || value === "error") return value;
  return "info";
}

function normalizePagePath(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 1024);
}

function normalizePayload(
  value: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const entries = Object.entries(value).slice(0, 60);
  return Object.fromEntries(entries);
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const body = (await request.json().catch(() => ({}))) as AnalyticsEventPayload;

    const eventName = normalizeEventName(body.event_name);
    if (!eventName) {
      return NextResponse.json({ error: "event_name is required" }, { status: 400 });
    }

    let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const isNewSessionId = !sessionId;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const serviceRoleClient = createServiceRoleClient();
    const { error } = await serviceRoleClient.from("analytics_events").insert({
      session_id: sessionId,
      user_id: user?.id || null,
      event_name: eventName,
      event_level: normalizeEventLevel(body.event_level),
      page_path: normalizePagePath(body.page_path),
      payload: normalizePayload(body.payload),
    });

    // Keep endpoint resilient during rollout if migration isn't applied yet.
    if (error && error.code !== "42P01") {
      return NextResponse.json(
        { error: error.message || "Failed to persist analytics event" },
        { status: 500 }
      );
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
          error instanceof Error ? error.message : "Failed to process analytics event",
      },
      { status: 500 }
    );
  }
}
