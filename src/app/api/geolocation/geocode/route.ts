import { NextResponse } from "next/server";

/**
 * Geocoding API endpoint
 * Преобразует адрес (текст) в координаты (latitude, longitude)
 * Использует OpenStreetMap Nominatim API (бесплатный)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const country = searchParams.get("country");
  const city = searchParams.get("city");

  if (!address) {
    return NextResponse.json(
      { error: "Address is required" },
      { status: 400 }
    );
  }

  try {
    // Формируем поисковый запрос
    // Если есть страна и город, добавляем их для повышения точности
    let query = address.trim();
    if (city) {
      query = `${city}, ${query}`;
    }
    if (country) {
      query = `${query}, ${country}`;
    }

    // Используем OpenStreetMap Nominatim для геокодинга
    // Формат: https://nominatim.openstreetmap.org/search?format=json&q={query}
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=en`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "SolPoint/1.0", // Требуется Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    // Возвращаем первый результат (наиболее релевантный) и все варианты
    const firstResult = data[0];
    const results = data.map((item: any) => ({
      display_name: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      address: item.address,
      importance: item.importance || 0,
    }));

    return NextResponse.json({
      results,
      primary: {
        display_name: firstResult.display_name,
        latitude: parseFloat(firstResult.lat),
        longitude: parseFloat(firstResult.lon),
        address: firstResult.address,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Failed to geocode address",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

