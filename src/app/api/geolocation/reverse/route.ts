import { NextResponse } from "next/server";

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
 * Reverse geocoding API endpoint
 * Преобразует координаты (latitude, longitude) в страну и город
 * Использует OpenStreetMap Nominatim API (бесплатный)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = searchParams.get("latitude");
  const longitude = searchParams.get("longitude");

  if (!latitude || !longitude) {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "Invalid coordinates" },
      { status: 400 }
    );
  }

  try {
    // Используем OpenStreetMap Nominatim для reverse geocoding
    // Формат: https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "SolPoint/1.0", // Требуется Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.address) {
      return NextResponse.json(
        { error: "Could not determine location from coordinates" },
        { status: 404 }
      );
    }

    const address = data.address;

    // Извлекаем страну и город из ответа
    // Nominatim может возвращать разные поля в зависимости от региона
    const country = 
      address.country || 
      address.country_name || 
      null;
    
    // Получаем ISO код страны
    const countryCode = address.country_code?.toUpperCase() || 
                        (country ? COUNTRY_TO_CODE[country] : null) ||
                        null;
    
    const city = 
      address.city || 
      address.town || 
      address.village || 
      address.municipality ||
      address.county ||
      null;

    return NextResponse.json({
      country: country || "Unknown",
      country_code: countryCode,
      city: city && city.length <= 150 ? city : city?.substring(0, 150) || null,
      latitude: lat,
      longitude: lng,
      full_address: data.display_name,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Failed to determine location",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

