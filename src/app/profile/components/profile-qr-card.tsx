"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Copy, ExternalLink, QrCode, RefreshCw } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { trackEvent } from "@/lib/analytics";
import { getMyProfileQr } from "@/lib/api/qr";
import type { ProfileQrCode } from "@/types";

interface ProfileQrCardProps {
  userHandle: string;
}

export function ProfileQrCard({ userHandle }: ProfileQrCardProps) {
  const [qrCode, setQrCode] = useState<ProfileQrCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadQrCode() {
      try {
        setIsLoading(true);
        setError(null);
        const nextQrCode = await getMyProfileQr();

        if (!cancelled) {
          setQrCode(nextQrCode);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Failed to load your QR code"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadQrCode();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async () => {
    if (!qrCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(qrCode.scanUrl);
      setIsCopied(true);
      trackEvent("profile_qr_link_copied", {
        event_category: "QR",
        event_label: userHandle,
      });
      window.setTimeout(() => setIsCopied(false), 2500);
    } catch (copyError) {
      console.error("Copy profile QR link error:", copyError);
      alert("Failed to copy QR link");
    }
  };

  return (
    <Card variant="bordered" className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <QrCode className="w-5 h-5 text-[var(--color-primary)]" />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          My QR
        </h3>
      </div>

      <p className="text-sm text-[var(--color-text-secondary)] mb-4">
        Share this code to let people open your profile instantly and send a
        connection request in one tap.
      </p>

      {isLoading ? (
        <div className="rounded-2xl border border-[var(--color-surface-border)] p-4">
          <div className="aspect-square w-full rounded-xl bg-[var(--color-surface-hover)] animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[var(--color-surface-border)] p-4 space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      ) : qrCode ? (
        <>
          <div className="rounded-2xl border border-[var(--color-surface-border)] bg-white p-4 mb-4">
            <Image
              src={qrCode.imageUrl}
              alt={`QR code for @${userHandle}`}
              width={512}
              height={512}
              unoptimized
              className="w-full h-auto aspect-square"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant={isCopied ? "secondary" : "primary"} onClick={handleCopy}>
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy link
                </>
              )}
            </Button>

            <Button asChild variant="outline">
              <Link href={qrCode.scanUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open landing
              </Link>
            </Button>
          </div>
        </>
      ) : null}
    </Card>
  );
}
