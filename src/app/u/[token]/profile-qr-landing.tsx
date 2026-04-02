"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, QrCode, UserPlus } from "lucide-react";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { connectViaProfileQr, recordProfileQrScan } from "@/lib/api/qr";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@/types";
import type { FriendshipStatus } from "@/types/profile";

interface ProfileQrLandingProps {
  token: string;
  profile: Pick<
    User,
    | "id"
    | "twitter_handle"
    | "twitter_name"
    | "avatar_url"
    | "bio"
    | "role"
    | "is_open_to_meet"
    | "subscription_tier"
    | "is_verified"
  >;
  isOwnProfile: boolean;
}

function getScanSessionStorageKey(token: string): string {
  return `profile-qr-scan-session:${token}`;
}

function getOrCreateScanSessionId(token: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = getScanSessionStorageKey(token);
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const nextValue = window.crypto?.randomUUID?.();
  if (!nextValue) {
    return null;
  }

  window.sessionStorage.setItem(storageKey, nextValue);
  return nextValue;
}

function getConnectButtonLabel(
  isAuthenticated: boolean,
  relationship: FriendshipStatus,
  isOwnQr: boolean
): string {
  if (isOwnQr) {
    return "This is your QR";
  }

  if (!isAuthenticated) {
    return "Continue with Twitter";
  }

  if (relationship === "accepted") {
    return "Connected";
  }

  if (relationship === "pending_sent") {
    return "Request sent";
  }

  if (relationship === "pending_received") {
    return "Connect back";
  }

  return "Connect";
}

export function ProfileQrLanding({
  token,
  profile,
  isOwnProfile,
}: ProfileQrLandingProps) {
  const { user, isAuthenticated } = useAuth();
  const [scanSessionId, setScanSessionId] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<FriendshipStatus>(
    isOwnProfile ? "accepted" : "none"
  );
  const [isOwnQr, setIsOwnQr] = useState(isOwnProfile);
  const [isRecordingScan, setIsRecordingScan] = useState(!isOwnProfile);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOwnProfile) {
      return;
    }

    const nextScanSessionId = getOrCreateScanSessionId(token);
    setScanSessionId(nextScanSessionId);
  }, [isOwnProfile, token]);

  useEffect(() => {
    if (isOwnProfile || !scanSessionId) {
      setIsRecordingScan(false);
      return;
    }

    const currentScanSessionId = scanSessionId;
    let cancelled = false;

    async function recordScan() {
      try {
        setIsRecordingScan(true);
        setError(null);

        const result = await recordProfileQrScan(token, currentScanSessionId);

        if (!cancelled) {
          setRelationship(result.relationship);
          setIsOwnQr(result.isOwnQr);
          trackEvent("profile_qr_scan", {
            event_category: "QR",
            event_label: profile.twitter_handle,
            target_user_id: profile.id,
            is_authenticated: isAuthenticated,
            relationship: result.relationship,
          });
        }
      } catch (scanError) {
        if (!cancelled) {
          setError(
            scanError instanceof Error
              ? scanError.message
              : "Failed to load QR destination"
          );
        }
      } finally {
        if (!cancelled) {
          setIsRecordingScan(false);
        }
      }
    }

    recordScan();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isOwnProfile, profile.id, profile.twitter_handle, scanSessionId, token]);

  const connectButtonLabel = useMemo(
    () => getConnectButtonLabel(isAuthenticated, relationship, isOwnQr),
    [isAuthenticated, isOwnQr, relationship]
  );

  const handleConnect = async () => {
    if (isOwnQr) {
      return;
    }

    if (!isAuthenticated) {
      trackEvent("profile_qr_connect_login_redirect", {
        event_category: "QR",
        event_label: profile.twitter_handle,
        target_user_id: profile.id,
      });
      window.location.href = `/api/auth/twitter?redirect_to=${encodeURIComponent(
        `/u/${token}`
      )}`;
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      setSuccessMessage(null);

      const result = await connectViaProfileQr(token, scanSessionId);
      setRelationship(result.relationship);

      const nextMessage =
        result.action === "request_completed_mutual"
          ? "You are connected now."
          : result.action === "request_created"
            ? "Connection request sent."
            : result.action === "already_connected"
              ? "You are already connected."
              : "Connection request is already pending.";

      setSuccessMessage(nextMessage);

      trackEvent("profile_qr_connect", {
        event_category: "QR",
        event_label: profile.twitter_handle,
        target_user_id: profile.id,
        action: result.action,
        relationship: result.relationship,
      });
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Failed to send connection request"
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card
      variant="glass"
      className="w-full max-w-2xl border border-[var(--color-surface-border)]/80 bg-[var(--color-surface)]/80 backdrop-blur-xl shadow-2xl shadow-black/15"
    >
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] mb-5">
        <QrCode className="w-4 h-4 text-[var(--color-primary)]" />
        Scanned from SolPoint QR
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-start mb-5">
        <Avatar
          src={profile.avatar_url}
          alt={profile.twitter_name}
          size="xl"
          isVip={profile.subscription_tier === "vip"}
          isVerified={profile.is_verified}
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {profile.twitter_name}
            </h1>
            {profile.is_verified && <Badge variant="primary">Verified</Badge>}
            {profile.subscription_tier === "vip" && (
              <Badge variant="warning">PRO</Badge>
            )}
            {profile.is_open_to_meet && (
              <Badge variant="secondary">Open to meet</Badge>
            )}
          </div>

          <p className="text-[var(--color-text-muted)] mb-3">
            @{profile.twitter_handle}
          </p>

          {profile.bio ? (
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              {profile.bio}
            </p>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Connect instantly without asking how to find them later.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {successMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant={relationship === "accepted" ? "secondary" : "primary"}
          size="lg"
          onClick={handleConnect}
          disabled={
            isConnecting ||
            isRecordingScan ||
            isOwnQr ||
            relationship === "accepted" ||
            relationship === "pending_sent"
          }
          className="sm:min-w-56"
        >
          {relationship === "accepted" ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              {connectButtonLabel}
            </>
          ) : (
            <>
              {isConnecting || isRecordingScan ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {connectButtonLabel}
            </>
          )}
        </Button>

        <Button asChild variant="outline" size="lg">
          <Link href={`/profile/${profile.twitter_handle}`}>
            View profile
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>

      {!isAuthenticated && !isOwnQr && (
        <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
          Login is required before sending a connection request.
        </p>
      )}

      {user && !isOwnQr && relationship === "pending_received" && (
        <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
          @{profile.twitter_handle} already follows you. Connect back to make it
          mutual.
        </p>
      )}
    </Card>
  );
}
