"use client";

import { ErrorFallback } from "@/components/error/error-fallback";

export default function EventsError({
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
      title="Events Loading Error"
      message="Failed to load the events list. Please try refreshing the page or come back later."
    />
  );
}

