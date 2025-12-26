"use client";

import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
}

export function ErrorFallback({
  error,
  reset,
  title = "Something went wrong",
  message,
}: ErrorFallbackProps) {
  const displayMessage =
    message ||
    error.message ||
    "An unexpected error occurred. Please try refreshing the page.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-[var(--color-error)]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
          {title}
        </h1>

        {/* Message */}
        <p className="text-[var(--color-text-secondary)] mb-6">
          {displayMessage}
        </p>

        {/* Error details (only in development) */}
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mb-6 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-surface-border)] text-left">
            <p className="text-xs font-mono text-[var(--color-text-muted)] mb-2">
              Error details:
            </p>
            <p className="text-xs font-mono text-[var(--color-error)] break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-[var(--color-text-muted)] mt-2">
                Digest: {error.digest}
              </p>
            )}
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs text-[var(--color-text-muted)] cursor-pointer">
                  Stack trace
                </summary>
                <pre className="text-xs font-mono text-[var(--color-text-muted)] mt-2 overflow-auto max-h-40">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            className="border-[var(--color-surface-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to home
          </Button>
        </div>
      </div>
    </div>
  );
}

