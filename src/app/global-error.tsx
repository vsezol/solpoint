"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/error/error-fallback";

/**
 * global-error.tsx обрабатывает ошибки в корневом layout.tsx
 * Это единственный способ поймать ошибки в layout.tsx и других корневых компонентах
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Логируем критическую ошибку
    console.error("Global error (layout level):", error);

    // Здесь можно отправить ошибку в сервис мониторинга
    // Пример:
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, { level: 'fatal' });
    // }
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body>
        <ErrorFallback
          error={error}
          reset={reset}
          title="Critical Error"
          message="A critical error occurred in the application. Please refresh the page or return to the home page."
        />
      </body>
    </html>
  );
}

