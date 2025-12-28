"use client";

import { ErrorFallback } from "@/components/error/error-fallback";

export default function CommunitiesError({
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
      title="Communities Loading Error"
      message="Failed to load the communities list. Please try refreshing the page or come back later."
    />
  );
}

