import { createClient } from "@/lib/supabase/server";
import { isProfileQrEnabled } from "@/lib/qr/feature-flags";
import { ensureProfileQrForUser, toProfileQrViewModel } from "@/lib/qr/profile";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isProfileQrEnabled()) {
    return NextResponse.json({ error: "Profile QR is disabled" }, { status: 404 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const qrCode = await ensureProfileQrForUser(authUser.id);

    return NextResponse.json({
      qrCode: toProfileQrViewModel(qrCode),
    });
  } catch (error: unknown) {
    console.error("Get profile QR error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load profile QR code",
      },
      { status: 500 }
    );
  }
}
