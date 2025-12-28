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

// Инициализация GA4
export const initGA4 = (measurementId: string): void => {
  if (typeof window === 'undefined') return;

  // Добавляем скрипт GA4 если его еще нет
  if (!document.querySelector(`script[src*="gtag"]`)) {
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        page_path: window.location.pathname,
      });
    `;
    document.head.appendChild(script2);
  }
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

