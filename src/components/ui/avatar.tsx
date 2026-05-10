"use client";

import { cn, getInitials } from "@/lib/utils";
import { normalizeTwitterAvatarUrl } from "@/lib/twitter-avatar";
import Image from "next/image";
import { useState } from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "card";

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: AvatarSize;
  mobileSize?: AvatarSize;
  className?: string;
  isVerified?: boolean;
  fallbackVariant?: "initials" | "branded";
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-lg",
  card: "h-[70px] w-[70px] text-lg",
};

const mdSizeClasses: Record<AvatarSize, string> = {
  xs: "md:w-6 md:h-6 md:text-xs",
  sm: "md:w-8 md:h-8 md:text-xs",
  md: "md:w-10 md:h-10 md:text-sm",
  lg: "md:w-14 md:h-14 md:text-base",
  xl: "md:w-20 md:h-20 md:text-lg",
  card: "md:h-[70px] md:w-[70px] md:text-lg",
};

const badgeSizes: Record<AvatarSize, string> = {
  xs: "w-3 h-3 -right-0.5 -bottom-0.5",
  sm: "w-3.5 h-3.5 -right-0.5 -bottom-0.5",
  md: "w-4 h-4 -right-1 -bottom-1",
  lg: "w-5 h-5 -right-1 -bottom-1",
  xl: "w-6 h-6 -right-1 -bottom-1",
  card: "w-5 h-5 -right-0.5 -bottom-0.5",
};

const mdBadgeSizes: Record<AvatarSize, string> = {
  xs: "md:w-3 md:h-3 md:-right-0.5 md:-bottom-0.5",
  sm: "md:w-3.5 md:h-3.5 md:-right-0.5 md:-bottom-0.5",
  md: "md:w-4 md:h-4 md:-right-1 md:-bottom-1",
  lg: "md:w-5 md:h-5 md:-right-1 md:-bottom-1",
  xl: "md:w-6 md:h-6 md:-right-1 md:-bottom-1",
  card: "md:w-5 md:h-5 md:-right-0.5 md:-bottom-0.5",
};

const imageSizes: Record<AvatarSize, string> = {
  xs: "24px",
  sm: "32px",
  md: "40px",
  lg: "56px",
  xl: "80px",
  card: "70px",
};

export function Avatar({
  src,
  alt,
  size = "md",
  mobileSize,
  className,
  isVerified = false,
  fallbackVariant = "initials",
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = src ? normalizeTwitterAvatarUrl(src) : null;

  const sizeClassName = mobileSize
    ? cn(sizeClasses[mobileSize], mdSizeClasses[size])
    : sizeClasses[size];
  const badgeClassName = mobileSize
    ? cn(badgeSizes[mobileSize], mdBadgeSizes[size])
    : badgeSizes[size];
  const imageSizeAttr = mobileSize
    ? `(min-width: 768px) ${imageSizes[size]}, ${imageSizes[mobileSize]}`
    : imageSizes[size];

  return (
    <div className={cn("relative inline-flex shrink-0 rounded-full", className)}>
      <div
        className={cn(
          "relative rounded-full overflow-hidden bg-[var(--color-surface-border)] flex items-center justify-center font-medium text-[var(--color-text-secondary)]",
          sizeClassName
        )}
      >
        {normalizedSrc && !hasError ? (
          <Image
            src={normalizedSrc}
            alt={alt}
            fill
            className="object-cover"
            sizes={imageSizeAttr}
            quality={90}
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
            badgeClassName
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
