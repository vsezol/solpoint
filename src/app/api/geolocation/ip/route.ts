import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Маппинг названий стран на ISO коды
const COUNTRY_TO_CODE: Record<string, string> = {
  "United States": "US",
  "United States of America": "US",
  "Russia": "RU",
  "Russian Federation": "RU",
  "Germany": "DE",
  "France": "FR",
  "Spain": "ES",
  "Italy": "IT",
  "Japan": "JP",
  "China": "CN",
  "South Korea": "KR",
  "Korea, South": "KR",
  "Singapore": "SG",
  "United Arab Emirates": "AE",
  "Canada": "CA",
  "Australia": "AU",
  "Brazil": "BR",
  "Mexico": "MX",
  "Argentina": "AR",
  "Chile": "CL",
  "India": "IN",
  "Thailand": "TH",
  "Vietnam": "VN",
  "Philippines": "PH",
  "Indonesia": "ID",
  "Turkey": "TR",
  "Türkiye": "TR",
  "Ukraine": "UA",
  "Poland": "PL",
  "Netherlands": "NL",
  "Sweden": "SE",
  "Norway": "NO",
  "Denmark": "DK",
  "Finland": "FI",
  "Switzerland": "CH",
  "Austria": "AT",
  "Belgium": "BE",
  "Portugal": "PT",
  "Greece": "GR",
  "Czech Republic": "CZ",
  "Czechia": "CZ",
  "Israel": "IL",
  "Saudi Arabia": "SA",
  "Egypt": "EG",
  "South Africa": "ZA",
  "Nigeria": "NG",
  "Kenya": "KE",
  "United Kingdom": "GB",
  "UK": "GB",
};

/**
 * IP-based geolocation API endpoint
 * Определяет страну и город пользователя по его IP адресу
 * Использует ipapi.co API (бесплатный, до 1000 запросов/день)
 */
export async function GET(request: NextRequest) {
  try {
    // Получаем IP адрес из заголовков запроса
    // Проверяем различные заголовки, которые могут содержать реальный IP
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const cfConnectingIp = request.headers.get("cf-connecting-ip"); // Cloudflare
    
    console.log("[IP Geolocation] Headers:", {
      "x-forwarded-for": forwarded,
      "x-real-ip": realIp,
      "cf-connecting-ip": cfConnectingIp,
      "request.ip": request.ip,
    });
    
    // Извлекаем первый IP из списка (x-forwarded-for может содержать несколько IP)
    const clientIp = 
      (forwarded?.split(",")[0]?.trim()) ||
      realIp ||
      cfConnectingIp ||
      request.ip ||
      null;

    console.log("[IP Geolocation] Detected client IP:", clientIp);

    if (!clientIp) {
      console.error("[IP Geolocation] Could not determine client IP address");
      return NextResponse.json(
        { error: "Could not determine client IP address" },
        { status: 400 }
      );
    }

    // Проверяем, является ли IP localhost или зарезервированным адресом
    const isLocalhost = 
      clientIp === "::1" || 
      clientIp === "127.0.0.1" || 
      clientIp === "localhost" ||
      clientIp.startsWith("127.") ||
      clientIp.startsWith("::ffff:127.") ||
      clientIp.startsWith("192.168.") ||
      clientIp.startsWith("10.") ||
      clientIp.startsWith("172.16.") ||
      clientIp.startsWith("172.17.") ||
      clientIp.startsWith("172.18.") ||
      clientIp.startsWith("172.19.") ||
      clientIp.startsWith("172.20.") ||
      clientIp.startsWith("172.21.") ||
      clientIp.startsWith("172.22.") ||
      clientIp.startsWith("172.23.") ||
      clientIp.startsWith("172.24.") ||
      clientIp.startsWith("172.25.") ||
      clientIp.startsWith("172.26.") ||
      clientIp.startsWith("172.27.") ||
      clientIp.startsWith("172.28.") ||
      clientIp.startsWith("172.29.") ||
      clientIp.startsWith("172.30.") ||
      clientIp.startsWith("172.31.");

    if (isLocalhost) {
      console.log("[IP Geolocation] Localhost/reserved IP detected, returning default values");
      return NextResponse.json({
        country: "Unknown",
        country_code: null,
        city: null,
        ip: clientIp,
      });
    }

    // Используем ipapi.co для определения локации по IP
    // Бесплатный план: до 1000 запросов/день
    const ipapiUrl = `https://ipapi.co/${clientIp}/json/`;
    
    console.log("[IP Geolocation] Requesting from:", ipapiUrl);
    
    const response = await fetch(ipapiUrl, {
      headers: {
        "User-Agent": "SolPoint/1.0",
      },
    });

    console.log("[IP Geolocation] Response status:", response.status, response.statusText);
    console.log("[IP Geolocation] Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[IP Geolocation] Response error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`IP API error: ${response.status} - ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[IP Geolocation] Response data:", JSON.stringify(data, null, 2));

    // Проверяем, есть ли ошибка в ответе (например, зарезервированный IP)
    if (data.error) {
      console.warn("[IP Geolocation] API returned error, returning default values:", data);
      // Не возвращаем 500, а просто возвращаем Unknown значения
      return NextResponse.json({
        country: "Unknown",
        country_code: null,
        city: null,
        ip: clientIp,
      });
    }

    // Извлекаем страну и город из ответа
    const country = data.country_name || "Unknown";
    const countryCode = data.country_code?.toUpperCase() || 
                      (country ? COUNTRY_TO_CODE[country] : null) ||
                      null;
    const city = data.city || null;

    const result = {
      country: country,
      country_code: countryCode,
      city: city && city.length <= 150 ? city : city?.substring(0, 150) || null,
      ip: clientIp,
    };

    console.log("[IP Geolocation] Success, returning:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[IP Geolocation] Exception caught:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: "Failed to determine location from IP",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

