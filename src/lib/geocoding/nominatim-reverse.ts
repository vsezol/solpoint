/**
 * Server-side reverse geocoding via OpenStreetMap Nominatim.
 * Use for backend jobs (e.g. enriching event location after Luma transfer).
 * Respect Nominatim usage policy: max 1 request per second.
 */

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

export interface ReverseGeocodeResult {
  country: string | null;
  country_code: string | null;
  city: string | null;
  full_address?: string | null;
}

/**
 * Reverse geocode (lat, lng) to country, country_code, city.
 * Returns null if Nominatim fails or has no address.
 */
export async function reverseGeocodeFromNominatim(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "SolPoint/1.0",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    address?: {
      country?: string;
      country_name?: string;
      country_code?: string;
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      county?: string;
    };
    display_name?: string;
  };

  if (!data?.address) {
    return null;
  }

  const address = data.address;
  const country = address.country ?? address.country_name ?? null;
  const countryCode =
    address.country_code?.toUpperCase() ??
    (country ? COUNTRY_TO_CODE[country] ?? null : null);
  const city =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    null;

  const cityTrimmed =
    city && city.length > 150 ? city.substring(0, 150) : city;

  return {
    country: country ?? null,
    country_code: countryCode ?? null,
    city: cityTrimmed ?? null,
    full_address: data.display_name ?? null,
  };
}

/** Delay helper for rate limiting (Nominatim: 1 req/sec). */
export function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
