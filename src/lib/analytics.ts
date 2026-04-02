/**
 * Google Analytics 4 (GA4) утилита для отслеживания событий
 * 
 * Использование:
 * import { trackEvent } from '@/lib/analytics';
 * 
 * trackEvent('event_name', {
 *   event_category: 'Category',
 *   event_label: 'Label',
 *   // другие параметры
 * });
 */

// Типы для событий
export interface AnalyticsEventParams {
  event_category?: string;
  event_label?: string;
  [key: string]: string | number | boolean | undefined;
}

// Проверка доступности GA4
export const isGA4Available = (): boolean => {
  if (typeof window === 'undefined') return false;
  return typeof window.gtag !== 'undefined';
};

/**
 * GA4 is initialized via <Script> in google-analytics.tsx with a CSP nonce.
 * This function is kept as a no-op to avoid breaking any legacy call sites.
 */
export const initGA4 = (_measurementId: string): void => {
  // Initialization is handled declaratively via next/script in the layout.
};

// Отправка события в GA4
export const trackEvent = (
  eventName: string,
  params?: AnalyticsEventParams
): void => {
  if (!isGA4Available()) {
    // В режиме разработки логируем события в консоль
    if (process.env.NODE_ENV === 'development') {
      console.log('[GA4 Event]', eventName, params);
    }
    return;
  }

  try {
    window.gtag('event', eventName, {
      ...params,
      // Добавляем контекстную информацию
      page_path: window.location.pathname,
      page_title: document.title,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking GA4 event:', error);
  }
};

// Отправка page_view события
export const trackPageView = (path: string, title?: string): void => {
  if (!isGA4Available()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[GA4 PageView]', path, title);
    }
    return;
  }

  try {
    window.gtag('config', process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '', {
      page_path: path,
      page_title: title || document.title,
    });
  } catch (error) {
    console.error('Error tracking GA4 page view:', error);
  }
};

// Установка пользовательских свойств
export const setUserProperties = (properties: Record<string, string | number | boolean>): void => {
  if (!isGA4Available()) return;

  try {
    window.gtag('set', 'user_properties', properties);
  } catch (error) {
    console.error('Error setting user properties:', error);
  }
};

// Установка ID пользователя
export const setUserId = (userId: string | null): void => {
  if (!isGA4Available()) return;

  try {
    if (userId) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '', {
        user_id: userId,
      });
    } else {
      window.gtag('config', process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '', {
        user_id: null,
      });
    }
  } catch (error) {
    console.error('Error setting user ID:', error);
  }
};

// Типы для window.gtag
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (
      command: 'config' | 'event' | 'set' | 'js',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
  }
}

