import type {
  ProfileQrCode,
  ProfileQrConnectResponse,
  ProfileQrScanResponse,
} from "@/types";

async function parseJsonOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error ||
        `Request failed with status ${response.status}`
    );
  }
  return data;
}

export async function getMyProfileQr(): Promise<ProfileQrCode> {
  const response = await fetch("/api/qr/profile/me", {
    cache: "no-store",
  });
  const data = (await parseJsonOrThrow(response)) as {
    qrCode?: ProfileQrCode;
  };

  if (!data.qrCode) {
    throw new Error("Invalid response from server");
  }

  return data.qrCode;
}

export async function recordProfileQrScan(
  token: string,
  scanSessionId: string
): Promise<ProfileQrScanResponse> {
  const response = await fetch(`/api/qr/profile/${token}/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scanSessionId }),
  });

  return (await parseJsonOrThrow(response)) as ProfileQrScanResponse;
}

export async function connectViaProfileQr(
  token: string,
  scanSessionId?: string | null
): Promise<ProfileQrConnectResponse> {
  const response = await fetch(`/api/qr/profile/${token}/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scanSessionId }),
  });

  return (await parseJsonOrThrow(response)) as ProfileQrConnectResponse;
}
