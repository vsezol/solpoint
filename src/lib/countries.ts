import { createClient } from "./supabase/client";
import type { Country } from "@/types";

/**
 * Получить все доступные страны из базы данных
 */
export async function getCountries(): Promise<Country[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("countries")
    .select("code, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching countries:", error);
    return [];
  }

  return data || [];
}

/**
 * Получить страну по коду
 */
export async function getCountryByCode(code: string): Promise<Country | null> {
  if (!code || code.length !== 2) {
    return null;
  }

  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("countries")
    .select("code, name")
    .eq("code", code.toUpperCase())
    .single();

  if (error) {
    console.error("Error fetching country:", error);
    return null;
  }

  return data;
}

/**
 * Валидация кода страны
 */
export function isValidCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code);
}

/**
 * Нормализация кода страны (приведение к uppercase)
 */
export function normalizeCountryCode(code: string): string {
  return code.toUpperCase();
}

/**
 * Проверка и нормализация города
 */
export function validateCity(city: string | undefined | null): string | null {
  if (!city) return null;
  
  const trimmed = city.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 150) {
    console.warn("City name exceeds 150 characters, truncating");
    return trimmed.substring(0, 150);
  }
  
  return trimmed;
}

/**
 * Статический список стран (для offline использования или как fallback)
 */
export const COUNTRIES_STATIC: Country[] = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "RU", name: "Russia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "IN", name: "India" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "PH", name: "Philippines" },
  { code: "ID", name: "Indonesia" },
  { code: "TR", name: "Turkey" },
  { code: "UA", name: "Ukraine" },
  { code: "PL", name: "Poland" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "PT", name: "Portugal" },
  { code: "GR", name: "Greece" },
  { code: "CZ", name: "Czech Republic" },
  { code: "IL", name: "Israel" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "EG", name: "Egypt" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
];

