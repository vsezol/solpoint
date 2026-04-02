import { NextRequest, NextResponse } from "next/server";
import {
  normalizeValidCoordinates,
  resolveTimezoneFromCoordinates,
} from "@/lib/timezone-from-coords";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");

    if (latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 }
      );
    }

    const normalizedCoordinates = normalizeValidCoordinates({ latitude, longitude });
    if (!normalizedCoordinates) {
      return NextResponse.json(
        { error: "Invalid latitude/longitude values" },
        { status: 400 }
      );
    }

    const timezone = resolveTimezoneFromCoordinates(normalizedCoordinates);
    return NextResponse.json({ timezone });
  } catch (error) {
    console.error("Timezone from coords error:", error);
    return NextResponse.json(
      { error: "Failed to resolve timezone from coordinates" },
      { status: 500 }
    );
  }
}
