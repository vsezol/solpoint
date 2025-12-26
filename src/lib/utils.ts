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

