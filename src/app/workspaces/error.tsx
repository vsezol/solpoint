"use client";

import { ErrorFallback } from "@/components/error/error-fallback";

export default function WorkspacesError({
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
      title="Workspaces Loading Error"
      message="Failed to load the workspaces list. Please try refreshing the page or come back later."
    />
  );
}

