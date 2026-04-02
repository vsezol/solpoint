import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Получает базовый URL приложения
 * Использует NEXT_PUBLIC_APP_URL из переменных окружения или window.location.origin
 */
export function getAppUrl(): string {
  // На сервере используем переменную окружения
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }
  
  // В браузере используем переменную окружения или window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
}

/**
 * Получает origin для OAuth redirects
 * 
 * Автоматически определяет правильный URL в зависимости от окружения:
 * - В development: всегда использует localhost:3000 (или NEXT_PUBLIC_APP_URL если установлен)
 * - В production: использует NEXT_PUBLIC_APP_URL или fallback на https://solpoint.xyz
 * 
 * Важно: Настройка OAuth:
 * - В Twitter Developer Portal: нужен только один callback URL - Supabase callback
 *   (например: https://your-project.supabase.co/auth/v1/callback)
 * - В Supabase Dashboard → Authentication → URL Configuration: нужно добавить оба redirect URL:
 *   - http://localhost:3000/api/auth/callback (для development)
 *   - https://solpoint.xyz/api/auth/callback (для production)
 * 
 * После этого код автоматически выберет правильный URL в зависимости от окружения.
 * 
 * @param requestOrigin - origin из запроса (опционально, для fallback в production)
 */
export function getAppOrigin(requestOrigin?: string): string {
  // В development режиме приоритет отдаем реальному origin запроса
  // (важно для тестов с телефона по LAN, например 192.168.x.x)
  if (process.env.NODE_ENV === "development") {
    return requestOrigin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }
  
  // В production используем переменную окружения
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Если NEXT_PUBLIC_APP_URL не установлен, проверяем requestOrigin
  // Если это localhost (локальное тестирование production), используем production домен
  if (requestOrigin && (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1'))) {
    return "https://solpoint.xyz";
  }
  
  // Иначе используем requestOrigin или fallback на production домен
  return requestOrigin || "https://solpoint.xyz";
}

/**
 * Получает отображаемое название подписки
 * На бэкенде используется "vip", но пользователю показываем "PRO"
 */
export function getSubscriptionDisplayName(tier: string): string {
  if (tier === "vip") return "PRO";
  if (tier === "free") return "Free";
  return tier; // fallback
}

/**
 * Проверяет, является ли пользователь PRO (VIP на бэкенде)
 * Использует subscription_tier из профиля, который приходит из /api/auth/me
 */
export function isProUser(tier: string | undefined): boolean {
  return tier === "vip";
}

/**
 * Проверяет, является ли строка UUID
 * UUID имеет формат: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 символов с дефисами)
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
