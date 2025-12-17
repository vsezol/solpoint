"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initGA4, trackPageView } from "@/lib/analytics";

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Инициализируем GA4 при монтировании компонента
    // Используем переменную окружения NEXT_PUBLIC_GA4_MEASUREMENT_ID
    // Для разработки: создайте .env.local с вашим dev GA4 ID
    // Для продакшена: установите переменную в настройках деплоя (Vercel/другое)
    const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
    
    if (!measurementId) {
      // В режиме разработки просто логируем предупреждение
      if (process.env.NODE_ENV === 'development') {
        console.warn('[GA4] NEXT_PUBLIC_GA4_MEASUREMENT_ID не установлен. События будут логироваться в консоль.');
      }
      return;
    }

    initGA4(measurementId);
  }, []);

  useEffect(() => {
    // Отслеживаем изменения страницы
    const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
    if (measurementId && pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      trackPageView(url);
    }
  }, [pathname, searchParams]);

  return null;
}

