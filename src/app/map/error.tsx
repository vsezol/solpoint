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
      title="Ошибка загрузки карты"
      message="Не удалось загрузить карту. Возможно, проблема с подключением к интернету или сервером. Пожалуйста, попробуйте обновить страницу."
    />
  );
}

