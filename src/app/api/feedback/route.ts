import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

interface RateWindow {
  count: number;
  windowStart: number;
}

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;
const feedbackStore = new Map<string, RateWindow>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}

function checkRateLimit(request: NextRequest): boolean {
  const key = getClientIp(request);
  const now = Date.now();
  const state = feedbackStore.get(key);

  if (!state) {
    feedbackStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (now - state.windowStart >= RATE_WINDOW_MS) {
    feedbackStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (state.count >= RATE_LIMIT) {
    return false;
  }

  state.count += 1;
  return true;
}

function normalizeValue(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, " ");
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  if (!checkRateLimit(request)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    const name = normalizeValue(body?.name);
    const email = normalizeValue(body?.email).toLowerCase();
    const message = normalizeValue(body?.message);
    const source = normalizeValue(body?.source) || "landing_contact_support";

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json(
        { error: "Name must be between 2 and 120 characters." },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email) || email.length > 255) {
      return NextResponse.json(
        { error: "Please provide a valid email." },
        { status: 400 }
      );
    }

    if (message.length < 3 || message.length > 2000) {
      return NextResponse.json(
        { error: "Message must be between 3 and 2000 characters." },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const userAgent = request.headers.get("user-agent") || null;
    const ipAddress = getClientIp(request);

    const { error } = await supabase.from("feedback_messages").insert({
      name,
      email,
      message,
      source,
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    if (error) {
      console.error("Failed to save feedback message:", error);
      return NextResponse.json(
        { error: "Failed to send message. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to process feedback message:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
