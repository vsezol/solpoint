"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/error/error-fallback";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Логируем ошибку для мониторинга
    console.error("Global error caught:", error);

    // Здесь можно отправить ошибку в сервис мониторинга
    // Пример:
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error);
    // }
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="An Error Occurred"
      message="Something went wrong while loading the page. Please try refreshing the page or return to the home page."
    />
  );
}

