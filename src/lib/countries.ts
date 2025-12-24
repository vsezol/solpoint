import type { Country } from "@/types";

/**
 * Получить все доступные страны из базы данных через API
 */
export async function getCountries(): Promise<Country[]> {
  try {
    const response = await fetch("/api/countries", {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Error fetching countries:", response.status);
      return [];
    }

    const { countries } = await response.json();
    return countries || [];
  } catch (error) {
    console.error("Error fetching countries:", error);
    return [];
  }
}

/**
 * Получить страну по коду через API
 */
export async function getCountryByCode(code: string): Promise<Country | null> {
  if (!code || code.length !== 2) {
    return null;
  }

  try {
    const response = await fetch(`/api/countries/${code.toUpperCase()}`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.error("Error fetching country:", response.status);
      return null;
    }

    const { country } = await response.json();
    return country || null;
  } catch (error) {
    console.error("Error fetching country:", error);
    return null;
  }
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

/**
 * Координаты центров стран (lat, lng)
 */
export const COUNTRY_CENTERS: Record<string, [number, number]> = {
  US: [39.8283, -98.5795],
  GB: [54.7024, -3.2766],
  RU: [61.5240, 105.3188],
  DE: [51.1657, 10.4515],
  FR: [46.2276, 2.2137],
  ES: [40.4637, -3.7492],
  IT: [41.8719, 12.5674],
  JP: [36.2048, 138.2529],
  CN: [35.8617, 104.1954],
  KR: [35.9078, 127.7669],
  SG: [1.3521, 103.8198],
  AE: [23.4241, 53.8478],
  CA: [56.1304, -106.3468],
  AU: [-25.2744, 133.7751],
  BR: [-14.2350, -51.9253],
  MX: [23.6345, -102.5528],
  AR: [-38.4161, -63.6167],
  CL: [-35.6751, -71.5430],
  IN: [20.5937, 78.9629],
  TH: [15.8700, 100.9925],
  VN: [14.0583, 108.2772],
  PH: [12.8797, 121.7740],
  ID: [-0.7893, 113.9213],
  TR: [38.9637, 35.2433],
  UA: [48.3794, 31.1656],
  PL: [51.9194, 19.1451],
  NL: [52.1326, 5.2913],
  SE: [60.1282, 18.6435],
  NO: [60.4720, 8.4689],
  DK: [56.2639, 9.5018],
  FI: [61.9241, 25.7482],
  CH: [46.8182, 8.2275],
  AT: [47.5162, 14.5501],
  BE: [50.5039, 4.4699],
  PT: [39.3999, -8.2245],
  GR: [39.0742, 21.8243],
  CZ: [49.8175, 15.4730],
  IL: [31.0461, 34.8516],
  SA: [23.8859, 45.0792],
  EG: [26.0975, 30.0444],
  ZA: [-30.5595, 22.9375],
  NG: [9.0820, 8.6753],
  KE: [-0.0236, 37.9062],
  KZ: [48.0196, 66.9237],
  UZ: [41.3775, 64.5853],
  KG: [41.2044, 74.7661],
  TJ: [38.8610, 71.2761],
  TM: [38.9697, 59.5563],
  AZ: [40.1431, 47.5769],
  AM: [40.0691, 45.0382],
  GE: [42.3154, 43.3569],
  BY: [53.7098, 27.9534],
  RO: [45.9432, 24.9668],
  BG: [42.7339, 25.4858],
  RS: [44.0165, 21.0059],
  HR: [45.1000, 15.2000],
  HU: [47.1625, 19.5033],
  SK: [48.6690, 19.6990],
  SI: [46.1512, 14.9955],
  IE: [53.4129, -8.2439],
  IS: [64.9631, -19.0208],
  LU: [49.8153, 6.1296],
  MT: [35.9375, 14.3754],
  CY: [35.1264, 33.4299],
  MY: [4.2105, 101.9758],
  BD: [23.6850, 90.3563],
  PK: [30.3753, 69.3451],
  AF: [33.9391, 67.7100],
  IR: [32.4279, 53.6880],
  IQ: [33.2232, 43.6793],
  JO: [30.5852, 36.2384],
  LB: [33.8547, 35.8623],
  SY: [34.8021, 38.9968],
  KW: [29.3117, 47.4818],
  QA: [25.3548, 51.1839],
  BH: [25.9304, 50.6378],
  OM: [21.4735, 55.9754],
  YE: [15.5527, 48.5164],
  ET: [9.1450, 38.7667],
  TZ: [-6.3690, 34.8888],
  UG: [1.3733, 32.2903],
  GH: [7.9465, -1.0232],
  DZ: [28.0339, 1.6596],
  MA: [31.7917, -7.0926],
  TN: [33.8869, 9.5375],
  LY: [26.3351, 17.2283],
  SD: [12.8628, 30.2176],
  ER: [15.1794, 39.7823],
  DJ: [11.8251, 42.5903],
  SO: [5.1521, 46.1996],
  MW: [-13.2543, 34.3015],
  ZM: [-13.1339, 27.8493],
  ZW: [-19.0154, 29.1549],
  BW: [-22.3285, 24.6849],
  NA: [-22.9576, 18.4904],
  MZ: [-18.6657, 35.5296],
  MG: [-18.7669, 46.8691],
  MU: [-20.3484, 57.5522],
  RE: [-21.1151, 55.5364],
  SC: [-4.6796, 55.4920],
  MV: [3.2028, 73.2207],
  LK: [7.8731, 80.7718],
  MM: [21.9162, 95.9560],
  LA: [19.8563, 102.4955],
  KH: [12.5657, 104.9910],
  BN: [4.5353, 114.7277],
  TW: [23.6978, 120.9605],
  HK: [22.3193, 114.1694],
  MO: [22.1987, 113.5439],
  MN: [46.8625, 103.8467],
  KP: [40.3399, 127.5101],
  NZ: [-40.9006, 174.8860],
  FJ: [-16.5783, 179.4144],
  PG: [-6.3150, 143.9555],
  NC: [-20.9043, 165.6180],
  PF: [-17.6797, -149.4068],
  CO: [4.5709, -74.2973],
  VE: [6.4238, -66.5897],
  PE: [-9.1900, -75.0152],
  EC: [-1.8312, -78.1834],
  BO: [-16.2902, -63.5887],
  PY: [-23.4425, -58.4438],
  UY: [-32.5228, -55.7658],
  GF: [3.9339, -53.1258],
  SR: [3.9193, -56.0278],
  GY: [4.8604, -58.9302],
  CR: [9.7489, -83.7534],
  PA: [8.5380, -80.7821],
  NI: [12.2650, -85.2072],
  HN: [15.2000, -86.2419],
  GT: [15.7835, -90.2308],
  BZ: [17.1899, -88.4976],
  SV: [13.7942, -88.8965],
  DO: [18.7357, -70.1627],
  HT: [18.9712, -72.2852],
  CU: [21.5218, -77.7812],
  JM: [18.1096, -77.2975],
  BS: [25.0343, -77.3963],
  PR: [18.2208, -66.5901],
  TT: [10.6918, -61.2225],
  BB: [13.1939, -59.5432],
  GD: [12.2626, -61.6048],
  LC: [13.9094, -60.9789],
  VC: [12.9843, -61.2872],
  AG: [17.0608, -61.7964],
  DM: [15.4150, -61.3710],
  KN: [17.3578, -62.7830],
};

/**
 * Координаты крупных городов мира (lat, lng)
 */
export const MAJOR_CITIES: Array<{ name: string; lat: number; lng: number; countryCode: string }> = [
  // Европа
  { name: "London", lat: 51.5074, lng: -0.1278, countryCode: "GB" },
  { name: "Paris", lat: 48.8566, lng: 2.3522, countryCode: "FR" },
  { name: "Berlin", lat: 52.5200, lng: 13.4050, countryCode: "DE" },
  { name: "Madrid", lat: 40.4168, lng: -3.7038, countryCode: "ES" },
  { name: "Rome", lat: 41.9028, lng: 12.4964, countryCode: "IT" },
  { name: "Amsterdam", lat: 52.3676, lng: 4.9041, countryCode: "NL" },
  { name: "Vienna", lat: 48.2082, lng: 16.3738, countryCode: "AT" },
  { name: "Prague", lat: 50.0755, lng: 14.4378, countryCode: "CZ" },
  { name: "Warsaw", lat: 52.2297, lng: 21.0122, countryCode: "PL" },
  { name: "Stockholm", lat: 59.3293, lng: 18.0686, countryCode: "SE" },
  { name: "Copenhagen", lat: 55.6761, lng: 12.5683, countryCode: "DK" },
  { name: "Oslo", lat: 59.9139, lng: 10.7522, countryCode: "NO" },
  { name: "Helsinki", lat: 60.1699, lng: 24.9384, countryCode: "FI" },
  { name: "Dublin", lat: 53.3498, lng: -6.2603, countryCode: "IE" },
  { name: "Brussels", lat: 50.8503, lng: 4.3517, countryCode: "BE" },
  { name: "Zurich", lat: 47.3769, lng: 8.5417, countryCode: "CH" },
  { name: "Lisbon", lat: 38.7223, lng: -9.1393, countryCode: "PT" },
  { name: "Athens", lat: 37.9838, lng: 23.7275, countryCode: "GR" },
  { name: "Istanbul", lat: 41.0082, lng: 28.9784, countryCode: "TR" },
  { name: "Moscow", lat: 55.7558, lng: 37.6173, countryCode: "RU" },
  { name: "Kiev", lat: 50.4501, lng: 30.5234, countryCode: "UA" },
  
  // Азия
  { name: "Tokyo", lat: 35.6762, lng: 139.6503, countryCode: "JP" },
  { name: "Beijing", lat: 39.9042, lng: 116.4074, countryCode: "CN" },
  { name: "Shanghai", lat: 31.2304, lng: 121.4737, countryCode: "CN" },
  { name: "Seoul", lat: 37.5665, lng: 126.9780, countryCode: "KR" },
  { name: "Singapore", lat: 1.3521, lng: 103.8198, countryCode: "SG" },
  { name: "Bangkok", lat: 13.7563, lng: 100.5018, countryCode: "TH" },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777, countryCode: "IN" },
  { name: "Delhi", lat: 28.6139, lng: 77.2090, countryCode: "IN" },
  { name: "Bangalore", lat: 12.9716, lng: 77.5946, countryCode: "IN" },
  { name: "Jakarta", lat: -6.2088, lng: 106.8456, countryCode: "ID" },
  { name: "Manila", lat: 14.5995, lng: 120.9842, countryCode: "PH" },
  { name: "Ho Chi Minh City", lat: 10.8231, lng: 106.6297, countryCode: "VN" },
  { name: "Hanoi", lat: 21.0285, lng: 105.8542, countryCode: "VN" },
  { name: "Dubai", lat: 25.2048, lng: 55.2708, countryCode: "AE" },
  { name: "Abu Dhabi", lat: 24.4539, lng: 54.3773, countryCode: "AE" },
  { name: "Riyadh", lat: 24.7136, lng: 46.6753, countryCode: "SA" },
  { name: "Tel Aviv", lat: 32.0853, lng: 34.7818, countryCode: "IL" },
  { name: "Almaty", lat: 43.2566, lng: 76.9286, countryCode: "KZ" },
  { name: "Astana", lat: 51.1694, lng: 71.4491, countryCode: "KZ" },
  { name: "Tashkent", lat: 41.2995, lng: 69.2401, countryCode: "UZ" },
  { name: "Bishkek", lat: 42.8746, lng: 74.5698, countryCode: "KG" },
  
  // Северная Америка
  { name: "New York", lat: 40.7128, lng: -74.0060, countryCode: "US" },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437, countryCode: "US" },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194, countryCode: "US" },
  { name: "Chicago", lat: 41.8781, lng: -87.6298, countryCode: "US" },
  { name: "Miami", lat: 25.7617, lng: -80.1918, countryCode: "US" },
  { name: "Toronto", lat: 43.6532, lng: -79.3832, countryCode: "CA" },
  { name: "Vancouver", lat: 49.2827, lng: -123.1207, countryCode: "CA" },
  { name: "Mexico City", lat: 19.4326, lng: -99.1332, countryCode: "MX" },
  
  // Южная Америка
  { name: "São Paulo", lat: -23.5505, lng: -46.6333, countryCode: "BR" },
  { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, countryCode: "BR" },
  { name: "Buenos Aires", lat: -34.6037, lng: -58.3816, countryCode: "AR" },
  { name: "Santiago", lat: -33.4489, lng: -70.6693, countryCode: "CL" },
  { name: "Lima", lat: -12.0464, lng: -77.0428, countryCode: "PE" },
  { name: "Bogotá", lat: 4.7110, lng: -74.0721, countryCode: "CO" },
  
  // Африка
  { name: "Cairo", lat: 30.0444, lng: 31.2357, countryCode: "EG" },
  { name: "Johannesburg", lat: -26.2041, lng: 28.0473, countryCode: "ZA" },
  { name: "Cape Town", lat: -33.9249, lng: 18.4241, countryCode: "ZA" },
  { name: "Lagos", lat: 6.5244, lng: 3.3792, countryCode: "NG" },
  { name: "Nairobi", lat: -1.2921, lng: 36.8219, countryCode: "KE" },
  { name: "Casablanca", lat: 33.5731, lng: -7.5898, countryCode: "MA" },
  
  // Австралия и Океания
  { name: "Sydney", lat: -33.8688, lng: 151.2093, countryCode: "AU" },
  { name: "Melbourne", lat: -37.8136, lng: 144.9631, countryCode: "AU" },
  { name: "Auckland", lat: -36.8485, lng: 174.7633, countryCode: "NZ" },
];



