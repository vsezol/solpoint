/**
 * Geocode address to coordinates
 */
export interface GeocodeResult {
  display_name: string;
  latitude: number;
  longitude: number;
  address?: any;
  importance?: number;
}

export interface GeocodeResponse {
  results: GeocodeResult[];
  primary: GeocodeResult;
}

/**
 * Reverse geocode coordinates to address
 */
export interface ReverseGeocodeResult {
  country: string;
  country_code?: string;
  city?: string;
  full_address: string;
  latitude: number;
  longitude: number;
}

export async function geocodeAddress(
  address: string,
  options?: { country?: string; city?: string }
): Promise<GeocodeResponse | null> {
  try {
    const params = new URLSearchParams();
    params.append("address", address);
    if (options?.city) {
      params.append("city", options.city);
    }
    if (options?.country) {
      params.append("country", options.country);
    }

    const response = await fetch(`/api/geolocation/geocode?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error geocoding address:", errorData);
      return null;
    }

    const data: GeocodeResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error geocoding address:", error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  try {
    const params = new URLSearchParams();
    params.append("latitude", latitude.toString());
    params.append("longitude", longitude.toString());

    const response = await fetch(`/api/geolocation/reverse?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error reverse geocoding:", errorData);
      return null;
    }

    const data: ReverseGeocodeResult = await response.json();
    return data;
  } catch (error) {
    console.error("Error reverse geocoding:", error);
    return null;
  }
}
