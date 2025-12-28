"use client";

import { ErrorFallback } from "@/components/error/error-fallback";

export default function HubsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Hubs Loading Error"
      message="Failed to load the hubs list. Please try refreshing the page or come back later."
    />
  );
}

