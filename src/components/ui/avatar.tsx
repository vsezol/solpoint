"use client";

import { cn, getInitials } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "card";
  className?: string;
  isVerified?: boolean;
  isVip?: boolean;
  fallbackVariant?: "initials" | "branded";
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-lg",
  card: "h-[70px] w-[70px] text-lg",
};

const badgeSizes = {
  xs: "w-3 h-3 -right-0.5 -bottom-0.5",
  sm: "w-3.5 h-3.5 -right-0.5 -bottom-0.5",
  md: "w-4 h-4 -right-1 -bottom-1",
  lg: "w-5 h-5 -right-1 -bottom-1",
  xl: "w-6 h-6 -right-1 -bottom-1",
  card: "w-5 h-5 -right-0.5 -bottom-0.5",
};

export function Avatar({
  src,
  alt,
  size = "md",
  className,
  isVerified = false,
  isVip = false,
  fallbackVariant = "initials",
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          "relative rounded-full overflow-hidden bg-[var(--color-surface-border)] flex items-center justify-center font-medium text-[var(--color-text-secondary)]",
          sizeClasses[size],
          isVip && "ring-2 ring-[var(--color-marker-vip)]"
        )}
      >
        {src && !hasError ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            onError={() => setHasError(true)}
          />
        ) : fallbackVariant === "branded" ? (
          <svg
            viewBox="0 0 64 64"
            aria-hidden="true"
            className="h-[72%] w-[72%]"
          >
            <circle cx="32" cy="32" r="30" fill="#0F1319" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="#14F195" strokeWidth="1.5" />
            <circle cx="32" cy="32" r="26.4" fill="none" stroke="#8A5CFF" strokeWidth="1.2" opacity="0.85" />
            <circle cx="32" cy="24" r="9" fill="#CFD6E4" />
            <path d="M16 50c1.8-8.3 8.6-13 16-13s14.2 4.7 16 13" fill="#CFD6E4" />
          </svg>
        ) : (
          <span>{getInitials(alt)}</span>
        )}
      </div>
      {isVerified && (
        <div
          className={cn(
            "absolute flex items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-background)]",
            badgeSizes[size]
          )}
        >
          <svg
            className="w-2/3 h-2/3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
