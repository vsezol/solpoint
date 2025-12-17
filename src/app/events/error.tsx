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
      title="Ошибка загрузки событий"
      message="Не удалось загрузить список событий. Пожалуйста, попробуйте обновить страницу или вернуться позже."
    />
  );
}

