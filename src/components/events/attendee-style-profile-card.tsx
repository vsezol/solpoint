"use client";

import { MapPin, User } from "lucide-react";

import { Avatar, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const kodeMonoStyle = {
  fontFamily: "var(--font-kode-mono), monospace",
} as const;

const spaceGroteskStyle = {
  fontFamily: "var(--font-display), system-ui, sans-serif",
} as const;

export type AttendeeStrokeVariant = "top" | "bottom";

export interface AttendeeStyleProfileCardProps {
  displayName: string;
  avatarUrl?: string | null;
  isVerified: boolean;
  roleLabel: string;
  locationLine: string;
  aboutText: string;
  strokeVariant: AttendeeStrokeVariant;
  onView?: () => void;
  viewDisabled?: boolean;
  className?: string;
}

export function AttendeeStyleProfileCard({
  displayName,
  avatarUrl,
  isVerified,
  roleLabel,
  locationLine,
  aboutText,
  strokeVariant,
  onView,
  viewDisabled,
  className,
}: AttendeeStyleProfileCardProps) {
  const strokeClass =
    strokeVariant === "top"
      ? "bg-[linear-gradient(180deg,#00F68B_0%,#0B0B0B_100%)]"
      : "bg-[linear-gradient(180deg,#0B0B0B_0%,#00F68B_100%)]";

  return (
    <div
      className={cn(
        "h-full w-full max-w-[256px] rounded-[3px] p-[1px] sm:mx-auto",
        strokeClass,
        className
      )}
    >
      <article className="flex h-full min-h-[420px] w-full flex-col rounded-[3px] bg-[#0B0B0B] px-3 pb-4 pt-[13px] sm:min-h-[374px] sm:px-3 sm:pb-[14px] sm:pt-[13px]">
        <div className="flex flex-col items-center">
          <Avatar
            src={avatarUrl || undefined}
            alt={displayName}
            size="card"
            fallbackVariant="branded"
            isVerified={isVerified}
          />
          <h4
            className="mt-4 max-w-full truncate text-center text-[20px] font-bold leading-none tracking-normal text-white"
            style={spaceGroteskStyle}
            title={displayName}
          >
            {displayName}
          </h4>
        </div>

        <div className="mt-[19px] w-full min-w-0 space-y-[10px] text-[15px] font-medium leading-none tracking-normal text-[#16F196] sm:mt-[19px] sm:space-y-[10px]">
          <p className="-ml-2 flex items-end gap-[7px] sm:-ml-[6px]" style={kodeMonoStyle}>
            <User className="h-5 w-5 shrink-0 text-[#16F196]" strokeWidth={2} aria-hidden />
            <span className="min-w-0 wrap-break-word">{roleLabel}</span>
          </p>
          <p className="-ml-2 flex items-end gap-[7px] sm:-ml-[6px]" style={kodeMonoStyle}>
            <MapPin className="h-5 w-5 shrink-0 text-[#16F196]" strokeWidth={2} aria-hidden />
            <span className="min-w-0 wrap-break-word">{locationLine}</span>
          </p>
        </div>

        <div className="mt-[30px] flex min-h-0 flex-col sm:mt-[30px]">
          <p
            className="text-center text-[15px] font-medium leading-none tracking-normal text-[#70767D]"
            style={kodeMonoStyle}
          >
            About
          </p>
          <p
            className="mt-3 line-clamp-3 text-left text-[12px] font-medium leading-[1.25] tracking-normal text-white sm:mt-[9px]"
            style={spaceGroteskStyle}
          >
            {aboutText}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-auto h-[49px] w-[164px] shrink-0 self-center rounded-[7px] border-0 bg-white px-6 text-[20px] font-bold leading-none tracking-[-0.05em] text-black hover:bg-white/90"
          style={kodeMonoStyle}
          onClick={onView}
          disabled={viewDisabled}
        >
          View
        </Button>
      </article>
    </div>
  );
}
