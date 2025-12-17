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
      title="Ошибка загрузки хабов"
      message="Не удалось загрузить список хабов. Пожалуйста, попробуйте обновить страницу или вернуться позже."
    />
  );
}

