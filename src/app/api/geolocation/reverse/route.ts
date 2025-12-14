import { NextResponse } from "next/server";

/**
 * Reverse geocoding API endpoint
 * Преобразует координаты (latitude, longitude) в страну и город
 * Использует OpenStreetMap Nominatim API (бесплатный)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = searchParams.get("latitude");
  const longitude = searchParams.get("longitude");

  console.log("[REVERSE_GEOCODING] Request received:", { latitude, longitude });

  if (!latitude || !longitude) {
    console.warn("[REVERSE_GEOCODING] Missing coordinates");
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    console.warn("[REVERSE_GEOCODING] Invalid coordinates:", { lat, lng });
    return NextResponse.json(
      { error: "Invalid coordinates" },
      { status: 400 }
    );
  }

  try {
    // Используем OpenStreetMap Nominatim для reverse geocoding
    // Формат: https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`;
    
    console.log("[REVERSE_GEOCODING] Calling Nominatim API:", nominatimUrl);
    
    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "SolPoint/1.0", // Требуется Nominatim
      },
    });

    console.log("[REVERSE_GEOCODING] Nominatim response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[REVERSE_GEOCODING] Nominatim API error:", response.status, errorText);
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("[REVERSE_GEOCODING] Nominatim response data:", JSON.stringify(data, null, 2));

    if (!data || !data.address) {
      console.warn("[REVERSE_GEOCODING] No address in response");
      return NextResponse.json(
        { error: "Could not determine location from coordinates" },
        { status: 404 }
      );
    }

    const address = data.address;
    console.log("[REVERSE_GEOCODING] Address object:", JSON.stringify(address, null, 2));

    // Извлекаем страну и город из ответа
    // Nominatim может возвращать разные поля в зависимости от региона
    const country = 
      address.country || 
      address.country_name || 
      null;
    
    const city = 
      address.city || 
      address.town || 
      address.village || 
      address.municipality ||
      address.county ||
      null;

    const result = {
      country: country || "Unknown",
      city: city || null,
      latitude: lat,
      longitude: lng,
      full_address: data.display_name,
    };

    console.log("[REVERSE_GEOCODING] Returning result:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[REVERSE_GEOCODING] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to determine location",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

