import QRCode from "qrcode";
import { isProfileQrEnabled } from "@/lib/qr/feature-flags";
import {
  buildProfileQrScanUrl,
  resolveProfileQrTarget,
} from "@/lib/qr/profile";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!isProfileQrEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const { token } = await params;
  const target = await resolveProfileQrTarget(token);

  if (!target) {
    return new Response("Not found", { status: 404 });
  }

  const svg = await QRCode.toString(buildProfileQrScanUrl(token), {
    type: "svg",
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
