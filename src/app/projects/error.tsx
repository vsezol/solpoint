"use client";

import { ErrorFallback } from "@/components/error/error-fallback";

export default function ProjectsError({
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
      title="Projects Loading Error"
      message="Failed to load the projects list. Please try refreshing the page or come back later."
    />
  );
}

