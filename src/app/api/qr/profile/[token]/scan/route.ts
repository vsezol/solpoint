import { createClient } from "@/lib/supabase/server";
import { isProfileQrEnabled } from "@/lib/qr/feature-flags";
import { checkScanRateLimit } from "@/lib/qr/rate-limit";
import { upsertProfileQrScan } from "@/lib/qr/profile";
import { isUUID } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!isProfileQrEnabled()) {
    return NextResponse.json({ error: "Profile QR is disabled" }, { status: 404 });
  }

  if (!checkScanRateLimit(request)) {
    return NextResponse.json(
      { error: "Too many scan requests. Try again later." },
      { status: 429 }
    );
  }

  try {
    const { token } = await params;
    const body = await request.json().catch(() => ({}));
    const scanSessionId =
      typeof body.scanSessionId === "string" ? body.scanSessionId : "";

    if (!isUUID(scanSessionId)) {
      return NextResponse.json(
        { error: "scanSessionId must be a UUID" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const result = await upsertProfileQrScan({
      publicToken: token,
      scanSessionId,
      scannerProfileId: authUser?.id ?? null,
    });

    if (!result) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }

    return NextResponse.json({
      scanId: result.id,
      requiresAuth: !authUser,
      relationship: result.relationship,
      isOwnQr: result.isOwnQr,
    });
  } catch (error: unknown) {
    console.error("Record profile QR scan error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to record profile QR scan",
      },
      { status: 500 }
    );
  }
}
