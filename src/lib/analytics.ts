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

export interface AnalyticsEventParams {
  event_category?: string;
  event_label?: string;
  [key: string]: string | number | boolean | null | undefined;
}

type AnalyticsLevel = "info" | "warn" | "error";

const ANALYTICS_ENDPOINT = "/api/analytics/event";

function toSerializablePayload(
  params?: AnalyticsEventParams
): Record<string, unknown> {
  if (!params) return {};

  const entries = Object.entries(params).slice(0, 80);
  return Object.fromEntries(entries);
}

function sendToBackend(
  eventName: string,
  level: AnalyticsLevel,
  payload?: AnalyticsEventParams
) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    event_name: eventName,
    event_level: level,
    page_path: window.location.pathname + window.location.search,
    payload: {
      ...toSerializablePayload(payload),
      page_title: document.title,
      timestamp: new Date().toISOString(),
      user_agent: window.navigator.userAgent,
    },
  });

  // Prefer keepalive fetch. sendBeacon is not reliable for JSON APIs in all browsers.
  fetch(ANALYTICS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Best-effort analytics transport.
  });
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
  sendToBackend(eventName, "info", params);

  if (!isGA4Available()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[GA4 Event]', eventName, params);
    }
    return;
  }

  try {
    window.gtag('event', eventName, {
      ...params,
      page_path: window.location.pathname,
      page_title: document.title,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking GA4 event:', error);
    sendToBackend("ga4_track_event_failed", "error", {
      event_name: eventName,
      error_message: error instanceof Error ? error.message : "unknown_error",
    });
  }
};

export const trackError = (
  eventName: string,
  params?: AnalyticsEventParams
): void => {
  sendToBackend(eventName, "error", params);
};

// Отправка page_view события
export const trackPageView = (path: string, title?: string): void => {
  sendToBackend("page_view", "info", {
    page_path: path,
    page_title: title || (typeof document !== "undefined" ? document.title : ""),
  });

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
    sendToBackend("ga4_set_user_properties_failed", "error", {
      error_message: error instanceof Error ? error.message : "unknown_error",
    });
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
    sendToBackend("ga4_set_user_id_failed", "error", {
      user_id: userId,
      error_message: error instanceof Error ? error.message : "unknown_error",
    });
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

