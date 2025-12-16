import { useState, useCallback } from "react";

export interface GeolocationResult {
  country: string;
  country_code: string | undefined;
  city: string | null;
}

export interface UseGeolocationReturn {
  isDetecting: boolean;
  error: string | null;
  requestGeolocation: () => Promise<GeolocationResult | null>;
}

/**
 * Хук для определения страны и города пользователя через геолокацию
 * Использует браузерный API геолокации с fallback на IP-based определение
 */
export function useGeolocation(): UseGeolocationReturn {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fallback функция для получения локации по IP
   */
  const fetchLocationFromIP = useCallback(async (): Promise<GeolocationResult> => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      
      if (response.ok) {
        const data = await response.json();
        return {
          country: data.country_name || "Unknown",
          country_code: data.country_code || undefined,
          city: data.city || null,
        };
      }
    } catch (err) {
      console.error("IP-based geolocation failed:", err);
    }

    // Если не удалось определить, возвращаем Unknown
    return {
      country: "Unknown",
      country_code: undefined,
      city: null,
    };
  }, []);

  /**
   * Основная функция запроса геолокации
   */
  const requestGeolocation = useCallback(async (): Promise<GeolocationResult | null> => {
    setIsDetecting(true);
    setError(null);

    try {
      // Проверяем поддержку геолокации браузером
      if (!navigator.geolocation) {
        console.warn("Geolocation is not supported by this browser");
        const result = await fetchLocationFromIP();
        setIsDetecting(false);
        return result;
      }

      // Запрашиваем геолокацию через браузер
      return await new Promise<GeolocationResult>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              // Округляем координаты до 2 знаков для снижения точности (~1 км)
              const { latitude, longitude } = position.coords;
              const roundedLat = Math.round(latitude * 100) / 100;
              const roundedLng = Math.round(longitude * 100) / 100;
              
              // Вызываем API для преобразования координат в страну/город
              const response = await fetch(
                `/api/geolocation/reverse?latitude=${roundedLat}&longitude=${roundedLng}`
              );
              
              if (response.ok) {
                const data = await response.json();
                const result: GeolocationResult = {
                  country: data.country || "Unknown",
                  country_code: data.country_code || undefined,
                  city: data.city || null,
                };
                setIsDetecting(false);
                resolve(result);
              } else {
                // Если reverse geocoding не сработал, используем IP-based fallback
                const fallbackResult = await fetchLocationFromIP();
                setIsDetecting(false);
                resolve(fallbackResult);
              }
            } catch (err) {
              console.error("Reverse geocoding failed:", err);
              // Fallback на IP-based геолокацию
              const fallbackResult = await fetchLocationFromIP();
              setIsDetecting(false);
              resolve(fallbackResult);
            }
          },
          async (err) => {
            // Пользователь отклонил запрос или произошла ошибка
            console.warn("Geolocation permission denied or error:", err);
            setError("Location access was denied. Using IP-based location detection.");
            const fallbackResult = await fetchLocationFromIP();
            setIsDetecting(false);
            resolve(fallbackResult);
          },
          {
            enableHighAccuracy: false, // Не использовать GPS, только WiFi/сеть
            timeout: 10000, // Таймаут 10 секунд
            maximumAge: 60000 // Использовать кешированные данные до 1 минуты
          }
        );
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to detect location";
      setError(errorMessage);
      setIsDetecting(false);
      return null;
    }
  }, [fetchLocationFromIP]);

  return {
    isDetecting,
    error,
    requestGeolocation,
  };
}

