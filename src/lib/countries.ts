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
 * 
 * Источник координат:
 * - OpenStreetMap Nominatim API (используется в проекте для геокодирования)
 * - Стандартные географические справочники
 * 
 * Для добавления новых городов можно использовать скрипт:
 * node scripts/fetch-city-coordinates.mjs
 * 
 * Или получить координаты через API:
 * /api/geolocation/geocode?address={cityName}&country={countryName}
 */
export const MAJOR_CITIES: Array<{ name: string; lat: number; lng: number; countryCode: string }> = [
  // Европа
  { name: "London", lat: 51.5074, lng: -0.1278, countryCode: "GB" },
  { name: "Manchester", lat: 53.479, lng: -2.2452, countryCode: "GB" },
  { name: "Birmingham", lat: 52.48, lng: -1.9025, countryCode: "GB" },
  { name: "Edinburgh", lat: 55.9533, lng: -3.1883, countryCode: "GB" },
  { name: "Paris", lat: 48.8566, lng: 2.3522, countryCode: "FR" },
  { name: "Lyon", lat: 45.76, lng: 4.84, countryCode: "FR" },
  { name: "Marseille", lat: 43.2965, lng: 5.3698, countryCode: "FR" },
  { name: "Berlin", lat: 52.5200, lng: 13.4050, countryCode: "DE" },
  { name: "Munich", lat: 48.1375, lng: 11.575, countryCode: "DE" },
  { name: "Hamburg", lat: 53.55, lng: 10, countryCode: "DE" },
  { name: "Frankfurt", lat: 50.1109, lng: 8.6821, countryCode: "DE" },
  { name: "Cologne", lat: 50.9364, lng: 6.9528, countryCode: "DE" },
  { name: "Madrid", lat: 40.4168, lng: -3.7038, countryCode: "ES" },
  { name: "Barcelona", lat: 41.3833, lng: 2.1833, countryCode: "ES" },
  { name: "Valencia", lat: 39.4699, lng: -0.3763, countryCode: "ES" },
  { name: "Seville", lat: 37.3891, lng: -5.9845, countryCode: "ES" },
  { name: "Rome", lat: 41.8931, lng: 12.4828, countryCode: "IT" },
  { name: "Milan", lat: 45.4669, lng: 9.19, countryCode: "IT" },
  { name: "Naples", lat: 40.8358, lng: 14.2486, countryCode: "IT" },
  { name: "Turin", lat: 45.0792, lng: 7.6761, countryCode: "IT" },
  { name: "Amsterdam", lat: 52.3728, lng: 4.8936, countryCode: "NL" },
  { name: "Rotterdam", lat: 51.92, lng: 4.48, countryCode: "NL" },
  { name: "Vienna", lat: 48.2083, lng: 16.3725, countryCode: "AT" },
  { name: "Prague", lat: 50.0875, lng: 14.4214, countryCode: "CZ" },
  { name: "Warsaw", lat: 52.23, lng: 21.0111, countryCode: "PL" },
  { name: "Krakow", lat: 50.0614, lng: 19.9372, countryCode: "PL" },
  { name: "Stockholm", lat: 59.3275, lng: 18.0547, countryCode: "SE" },
  { name: "Gothenburg", lat: 57.7075, lng: 11.9675, countryCode: "SE" },
  { name: "Copenhagen", lat: 55.6805, lng: 12.5615, countryCode: "DK" },
  { name: "Oslo", lat: 59.9133, lng: 10.7389, countryCode: "NO" },
  { name: "Helsinki", lat: 60.1699, lng: 24.9384, countryCode: "FI" },
  { name: "Dublin", lat: 53.3498, lng: -6.2603, countryCode: "IE" },
  { name: "Brussels", lat: 50.8467, lng: 4.3525, countryCode: "BE" },
  { name: "Antwerp", lat: 51.2178, lng: 4.4003, countryCode: "BE" },
  { name: "Zurich", lat: 47.3769, lng: 8.5417, countryCode: "CH" },
  { name: "Geneva", lat: 46.2044, lng: 6.1432, countryCode: "CH" },
  { name: "Lisbon", lat: 38.7122, lng: -9.134, countryCode: "PT" },
  { name: "Porto", lat: 41.1579, lng: -8.6291, countryCode: "PT" },
  { name: "Athens", lat: 37.9838, lng: 23.7275, countryCode: "GR" },
  { name: "Thessaloniki", lat: 40.6403, lng: 22.9356, countryCode: "GR" },
  { name: "Istanbul", lat: 41.0136, lng: 28.955, countryCode: "TR" },
  { name: "Ankara", lat: 39.93, lng: 32.85, countryCode: "TR" },
  { name: "Izmir", lat: 38.42, lng: 27.14, countryCode: "TR" },
  { name: "Moscow", lat: 55.7506, lng: 37.6175, countryCode: "RU" },
  { name: "Saint Petersburg", lat: 59.9375, lng: 30.3086, countryCode: "RU" },
  { name: "Kiev", lat: 50.4501, lng: 30.5234, countryCode: "UA" },
  { name: "Budapest", lat: 47.4979, lng: 19.0402, countryCode: "HU" },
  { name: "Bucharest", lat: 44.4325, lng: 26.1039, countryCode: "RO" },
  { name: "Sofia", lat: 42.6977, lng: 23.3219, countryCode: "BG" },
  { name: "Belgrade", lat: 44.8178, lng: 20.4569, countryCode: "RS" },
  { name: "Zagreb", lat: 45.8131, lng: 15.9772, countryCode: "HR" },
  
  // Азия
  { name: "Tokyo", lat: 35.687, lng: 139.7495, countryCode: "JP" },
  { name: "Osaka", lat: 34.6937, lng: 135.5023, countryCode: "JP" },
  { name: "Kyoto", lat: 35.0116, lng: 135.7681, countryCode: "JP" },
  { name: "Yokohama", lat: 35.4437, lng: 139.6380, countryCode: "JP" },
  { name: "Beijing", lat: 39.9067, lng: 116.3975, countryCode: "CN" },
  { name: "Shanghai", lat: 31.2286, lng: 121.4747, countryCode: "CN" },
  { name: "Guangzhou", lat: 23.13, lng: 113.26, countryCode: "CN" },
  { name: "Shenzhen", lat: 22.5415, lng: 114.0596, countryCode: "CN" },
  { name: "Chengdu", lat: 30.66, lng: 104.0633, countryCode: "CN" },
  { name: "Hangzhou", lat: 30.267, lng: 120.153, countryCode: "CN" },
  { name: "Xi'an", lat: 34.2611, lng: 108.9422, countryCode: "CN" },
  { name: "Nanjing", lat: 32.0608, lng: 118.7789, countryCode: "CN" },
  { name: "Seoul", lat: 37.5667, lng: 126.9833, countryCode: "KR" },
  { name: "Busan", lat: 35.1796, lng: 129.0756, countryCode: "KR" },
  { name: "Incheon", lat: 37.4833, lng: 126.6333, countryCode: "KR" },
  { name: "Singapore", lat: 1.3, lng: 103.8, countryCode: "SG" },
  { name: "Bangkok", lat: 13.7525, lng: 100.4942, countryCode: "TH" },
  { name: "Chiang Mai", lat: 18.7953, lng: 98.9986, countryCode: "TH" },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777, countryCode: "IN" },
  { name: "Delhi", lat: 28.61, lng: 77.23, countryCode: "IN" },
  { name: "Bangalore", lat: 12.9789, lng: 77.5917, countryCode: "IN" },
  { name: "Hyderabad", lat: 17.3617, lng: 78.4747, countryCode: "IN" },
  { name: "Chennai", lat: 13.0825, lng: 80.275, countryCode: "IN" },
  { name: "Kolkata", lat: 22.5675, lng: 88.37, countryCode: "IN" },
  { name: "Pune", lat: 18.5204, lng: 73.8567, countryCode: "IN" },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714, countryCode: "IN" },
  { name: "Jakarta", lat: -6.175, lng: 106.8275, countryCode: "ID" },
  { name: "Surabaya", lat: -7.2458, lng: 112.7378, countryCode: "ID" },
  { name: "Bandung", lat: -6.9175, lng: 107.6191, countryCode: "ID" },
  { name: "Manila", lat: 14.5958, lng: 120.9772, countryCode: "PH" },
  { name: "Cebu", lat: 10.3157, lng: 123.8854, countryCode: "PH" },
  { name: "Ho Chi Minh City", lat: 10.7756, lng: 106.7019, countryCode: "VN" },
  { name: "Hanoi", lat: 21, lng: 105.85, countryCode: "VN" },
  { name: "Dubai", lat: 25.2631, lng: 55.2972, countryCode: "AE" },
  { name: "Abu Dhabi", lat: 24.4667, lng: 54.3667, countryCode: "AE" },
  { name: "Riyadh", lat: 24.65, lng: 46.71, countryCode: "SA" },
  { name: "Jeddah", lat: 21.5428, lng: 39.1728, countryCode: "SA" },
  { name: "Dammam", lat: 26.4207, lng: 50.0888, countryCode: "SA" },
  { name: "Tel Aviv", lat: 32.0853, lng: 34.7818, countryCode: "IL" },
  { name: "Jerusalem", lat: 31.7789, lng: 35.2256, countryCode: "IL" },
  { name: "Almaty", lat: 43.24, lng: 76.915, countryCode: "KZ" },
  { name: "Astana", lat: 51.1472, lng: 71.4222, countryCode: "KZ" },
  { name: "Tashkent", lat: 41.3111, lng: 69.2797, countryCode: "UZ" },
  { name: "Bishkek", lat: 42.8667, lng: 74.5667, countryCode: "KG" },
  { name: "Kuala Lumpur", lat: 3.1686, lng: 101.698, countryCode: "MY" },
  { name: "Penang", lat: 5.4164, lng: 100.3327, countryCode: "MY" },
  
  // Северная Америка
  { name: "New York", lat: 40.6943, lng: -73.9249, countryCode: "US" },
  { name: "Los Angeles", lat: 34.1141, lng: -118.4068, countryCode: "US" },
  { name: "San Francisco", lat: 37.7558, lng: -122.4449, countryCode: "US" },
  { name: "Chicago", lat: 41.8375, lng: -87.6866, countryCode: "US" },
  { name: "Miami", lat: 25.784, lng: -80.2101, countryCode: "US" },
  { name: "Denver", lat: 39.762, lng: -104.8758, countryCode: "US" },
  { name: "Houston", lat: 29.786, lng: -95.3885, countryCode: "US" },
  { name: "Phoenix", lat: 33.5722, lng: -112.0892, countryCode: "US" },
  { name: "Philadelphia", lat: 40.0077, lng: -75.1339, countryCode: "US" },
  { name: "San Antonio", lat: 29.4632, lng: -98.5238, countryCode: "US" },
  { name: "San Diego", lat: 32.8313, lng: -117.1222, countryCode: "US" },
  { name: "Dallas", lat: 32.7935, lng: -96.7667, countryCode: "US" },
  { name: "Austin", lat: 30.3005, lng: -97.7522, countryCode: "US" },
  { name: "Seattle", lat: 47.6211, lng: -122.3244, countryCode: "US" },
  { name: "Boston", lat: 42.3188, lng: -71.0852, countryCode: "US" },
  { name: "Washington", lat: 38.9047, lng: -77.0163, countryCode: "US" },
  { name: "Las Vegas", lat: 36.2333, lng: -115.2654, countryCode: "US" },
  { name: "Atlanta", lat: 33.7628, lng: -84.422, countryCode: "US" },
  { name: "Portland", lat: 45.5371, lng: -122.65, countryCode: "US" },
  { name: "Detroit", lat: 42.3834, lng: -83.1024, countryCode: "US" },
  { name: "Minneapolis", lat: 44.9635, lng: -93.2678, countryCode: "US" },
  { name: "Toronto", lat: 43.7417, lng: -79.3733, countryCode: "CA" },
  { name: "Vancouver", lat: 49.25, lng: -123.1, countryCode: "CA" },
  { name: "Montreal", lat: 45.5089, lng: -73.5617, countryCode: "CA" },
  { name: "Calgary", lat: 51.05, lng: -114.0667, countryCode: "CA" },
  { name: "Ottawa", lat: 45.4247, lng: -75.695, countryCode: "CA" },
  { name: "Mexico City", lat: 19.4326, lng: -99.1332, countryCode: "MX" },
  { name: "Guadalajara", lat: 20.6767, lng: -103.3475, countryCode: "MX" },
  { name: "Monterrey", lat: 25.6844, lng: -100.3181, countryCode: "MX" },
  
  // Южная Америка
  { name: "São Paulo", lat: -23.5505, lng: -46.6333, countryCode: "BR" },
  { name: "Rio de Janeiro", lat: -22.9111, lng: -43.2056, countryCode: "BR" },
  { name: "Brasília", lat: -15.7942, lng: -47.8822, countryCode: "BR" },
  { name: "Salvador", lat: -12.9831, lng: -38.4928, countryCode: "BR" },
  { name: "Fortaleza", lat: -3.7275, lng: -38.5275, countryCode: "BR" },
  { name: "Belo Horizonte", lat: -19.9281, lng: -43.9419, countryCode: "BR" },
  { name: "Buenos Aires", lat: -34.6037, lng: -58.3816, countryCode: "AR" },
  { name: "Córdoba", lat: -31.4167, lng: -64.1833, countryCode: "AR" },
  { name: "Santiago", lat: -33.4372, lng: -70.6506, countryCode: "CL" },
  { name: "Valparaíso", lat: -33.0472, lng: -71.6127, countryCode: "CL" },
  { name: "Lima", lat: -12.06, lng: -77.0375, countryCode: "PE" },
  { name: "Bogotá", lat: 4.7110, lng: -74.0721, countryCode: "CO" },
  { name: "Medellín", lat: 6.2308, lng: -75.5906, countryCode: "CO" },
  { name: "Caracas", lat: 10.4806, lng: -66.9036, countryCode: "VE" },
  { name: "Quito", lat: -0.22, lng: -78.5125, countryCode: "EC" },
  { name: "Montevideo", lat: -34.9056, lng: -56.1842, countryCode: "UY" },
  
  // Африка
  { name: "Cairo", lat: 30.0444, lng: 31.2357, countryCode: "EG" },
  { name: "Alexandria", lat: 31.1975, lng: 29.8925, countryCode: "EG" },
  { name: "Johannesburg", lat: -26.2044, lng: 28.0456, countryCode: "ZA" },
  { name: "Cape Town", lat: -33.9249, lng: 18.4241, countryCode: "ZA" },
  { name: "Durban", lat: -29.8833, lng: 31.05, countryCode: "ZA" },
  { name: "Lagos", lat: 6.455, lng: 3.3841, countryCode: "NG" },
  { name: "Abuja", lat: 9.0667, lng: 7.4833, countryCode: "NG" },
  { name: "Nairobi", lat: -1.2864, lng: 36.8172, countryCode: "KE" },
  { name: "Casablanca", lat: 33.5333, lng: -7.5833, countryCode: "MA" },
  { name: "Rabat", lat: 34.0209, lng: -6.8416, countryCode: "MA" },
  { name: "Marrakech", lat: 31.63, lng: -8.0089, countryCode: "MA" },
  { name: "Tunis", lat: 36.8065, lng: 10.1815, countryCode: "TN" },
  { name: "Algiers", lat: 36.7325, lng: 3.0872, countryCode: "DZ" },
  { name: "Addis Ababa", lat: 9.03, lng: 38.74, countryCode: "ET" },
  { name: "Dar es Salaam", lat: -6.8161, lng: 39.2803, countryCode: "TZ" },
  { name: "Accra", lat: 5.6037, lng: -0.1870, countryCode: "GH" },
  
  // Австралия и Океания
  { name: "Sydney", lat: -33.8667, lng: 151.2, countryCode: "AU" },
  { name: "Melbourne", lat: -37.8136, lng: 144.9631, countryCode: "AU" },
  { name: "Brisbane", lat: -27.4678, lng: 153.0281, countryCode: "AU" },
  { name: "Perth", lat: -31.9558, lng: 115.8597, countryCode: "AU" },
  { name: "Adelaide", lat: -34.9285, lng: 138.6007, countryCode: "AU" },
  { name: "Auckland", lat: -36.8492, lng: 174.7653, countryCode: "NZ" },
  { name: "Wellington", lat: -41.2865, lng: 174.7762, countryCode: "NZ" },
];



