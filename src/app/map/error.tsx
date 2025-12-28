"use client";

import { ErrorFallback } from "@/components/error/error-fallback";

export default function MapError({
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
      title="Map Loading Error"
      message="Failed to load the map. There may be a problem with your internet connection or the server. Please try refreshing the page."
    />
  );
}

