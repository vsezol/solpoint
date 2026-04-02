import { NextResponse } from "next/server";
import { reverseGeocodeFromNominatim } from "@/lib/geocoding/nominatim-reverse";

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
    const result = await reverseGeocodeFromNominatim(lat, lng);

    if (!result) {
      return NextResponse.json(
        { error: "Could not determine location from coordinates" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      country: result.country ?? "Unknown",
      country_code: result.country_code,
      city: result.city,
      latitude: lat,
      longitude: lng,
      full_address: result.full_address ?? undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to determine location",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

