"use client";

import dynamic from "next/dynamic";

const LumaAttendButton = dynamic(
  () => import("./luma-attend-button").then((mod) => ({ default: mod.LumaAttendButton })),
  { ssr: false }
);

interface LumaAttendButtonWrapperProps {
  eventSlug: string;
  lumaLink: string;
  isPaid: boolean;
  isRegistered: boolean;
  priceSol?: number;
}

export function LumaAttendButtonWrapper(props: LumaAttendButtonWrapperProps) {
  return <LumaAttendButton {...props} />;
}

