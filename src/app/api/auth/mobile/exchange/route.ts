import {
  getAccessTokenExpiresInSeconds,
  hashMobileOAuthCode,
  isValidMobileOAuthCodeFormat,
} from "@/lib/auth/mobile-oauth-handoff";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type HandoffExchangeRow = {
  access_token: string;
  refresh_token: string;
  user_id: string;
};

export async function POST(request: Request) {
  let code: string | null = null;

  try {
    const body = await request.json();
    code = typeof body?.code === "string" ? body.code.trim() : null;
  } catch {
    return NextResponse.json(
      { error: "invalid_or_expired_code" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (!code || !isValidMobileOAuthCodeFormat(code)) {
    return NextResponse.json(
      { error: "invalid_or_expired_code" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const codeHash = hashMobileOAuthCode(code);
  const serviceRoleClient = createServiceRoleClient();

  const { data: consumeData, error: consumeError } = await serviceRoleClient.rpc(
    "consume_mobile_oauth_handoff",
    { p_code_hash: codeHash }
  );

  if (consumeError) {
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  const consumedRow = Array.isArray(consumeData)
    ? (consumeData[0] as HandoffExchangeRow | undefined)
    : undefined;

  if (!consumedRow) {
    const { data: existingRow, error: lookupError } = await serviceRoleClient
      .from("mobile_oauth_handoffs")
      .select("consumed_at, expires_at")
      .eq("code_hash", codeHash)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        { error: "internal_error" },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    if (existingRow?.consumed_at) {
      return NextResponse.json(
        { error: "code_already_used" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { error: "invalid_or_expired_code" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (!consumedRow.access_token || !consumedRow.refresh_token) {
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    {
      access_token: consumedRow.access_token,
      refresh_token: consumedRow.refresh_token,
      token_type: "bearer",
      expires_in: getAccessTokenExpiresInSeconds(consumedRow.access_token),
      user_id: consumedRow.user_id,
    },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}
