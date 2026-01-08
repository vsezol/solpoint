"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, Marker, Popup, useMap, GeoJSON, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker, User, Event, Hub, Community, Workspace, Project } from "@/types";
import type { GeoJsonObject } from "geojson";
import { UserCard } from "@/components/cards/user-card";
import { EventCard } from "@/components/cards/event-card";
import { HubCard } from "@/components/cards/hub-card";
import { ProSubscriptionModal } from "@/components/ui";
import { trackEvent } from "@/lib/analytics";
import { COUNTRIES_STATIC, COUNTRY_CENTERS, MAJOR_CITIES } from "@/lib/countries";

// Fix for default markers (только в браузере)
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => void })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

// Custom marker icons for users with avatar
const createCustomIcon = (type: MapMarker["type"], user?: User) => {
  // Get avatar URL or use default
  const avatarUrl = user?.avatar_url || "";
  // Create unique ID for clipPath (sanitize user ID to avoid conflicts)
  const clipId = user?.id ? `avatar-clip-${user.id.replace(/[^a-zA-Z0-9]/g, '-')}` : 'avatar-clip-default';
  
  // Escape avatar URL for use in SVG
  const escapedAvatarUrl = avatarUrl ? avatarUrl.replace(/"/g, '&quot;') : '';
  
  // Create SVG with hub colors (#111820 background, #14f195 stroke) and user avatar
  const svg = `
    <svg width="46" height="54" viewBox="0 0 46 54" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <!-- Pin shape with hub colors -->
      <path d="M23 0C10.85 0 1 9.85 1 22C1 31.5 8.5 41.5 23 54C37.5 41.5 45 31.5 45 22C45 9.85 35.15 0 23 0Z" fill="#111820" stroke="#14f195" stroke-width="2"/>
      
      <!-- Avatar circle border (≈ +40%) -->
      <circle cx="23" cy="22" r="12.6" fill="none" stroke="#14f195" stroke-width="1.5"/>
      ${avatarUrl ? `
        <defs>
          <clipPath id="${clipId}">
            <circle cx="23" cy="22" r="12"/>
          </clipPath>
        </defs>
        <image xlink:href="${escapedAvatarUrl}" x="11" y="10" width="24" height="24" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>
      ` : `
        <circle cx="23" cy="22" r="12" fill="#14f195" fill-opacity="0.3"/>
      `}
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: `custom-marker ${type === "pro_user" ? "pro-user-marker" : "user-marker"}`,
    iconSize: [46, 54],
    iconAnchor: [23, 54],
    popupAnchor: [0, -50],
  });
};

// Hub marker using hub-pin.svg
const createHubIcon = () => {
  return L.divIcon({
    html: `<img src="/hub-pin.svg" alt="Hub" style="width: 46px; height: 54px;" />`,
    className: "custom-marker hub-marker",
    iconSize: [46, 54],
    iconAnchor: [23, 54],
    popupAnchor: [0, -50],
  });
};

// Event marker using event-pin.svg
const createEventIcon = () => {
  return L.divIcon({
    html: `<img src="/event-pin.svg" alt="Event" style="width: 46px; height: 54px;" />`,
    className: "custom-marker event-marker",
    iconSize: [46, 54],
    iconAnchor: [23, 54],
    popupAnchor: [0, -50],
  });
};

// Community marker using community-pin.svg
const createCommunityIcon = () => {
  return L.divIcon({
    html: `<img src="/community-pin.svg" alt="Community" style="width: 46px; height: 54px;" />`,
    className: "custom-marker community-marker",
    iconSize: [46, 54],
    iconAnchor: [23, 54],
    popupAnchor: [0, -50],
  });
};

// Workspace marker using workspace-pin.svg
const createWorkspaceIcon = () => {
  return L.divIcon({
    html: `<img src="/workspace-pin.svg" alt="Workspace" style="width: 46px; height: 54px;" />`,
    className: "custom-marker workspace-marker",
    iconSize: [46, 54],
    iconAnchor: [23, 54],
    popupAnchor: [0, -50],
  });
};

// Project marker using project-pin.svg
const createProjectIcon = () => {
  return L.divIcon({
    html: `<img src="/project-pin.svg" alt="Project" style="width: 46px; height: 54px;" />`,
    className: "custom-marker project-marker",
    iconSize: [46, 54],
    iconAnchor: [23, 54],
    popupAnchor: [0, -50],
  });
};

interface MapControllerProps {
  center?: [number, number];
  zoom?: number;
}

function MapController({ center, zoom }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (map && center && zoom) {
      try {
        map.setView(center, zoom);
      } catch (error) {
        console.error("Error setting map view:", error);
      }
    }
  }, [map, center, zoom]);

  return null;
}

// Компонент для отслеживания уровня зума
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

// Функция для создания текстовой метки
const createTextLabel = (text: string, fontSize: number = 14) => {
  return L.divIcon({
    html: `<div style="
      color: #000000;
      text-shadow: 
        -1px -1px 0 #ffffff,
        1px -1px 0 #ffffff,
        -1px 1px 0 #ffffff,
        1px 1px 0 #ffffff,
        0 0 2px #ffffff;
      font-weight: bold;
      font-size: ${fontSize}px;
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
    ">${text}</div>`,
    className: "text-label",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

interface SolPointMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (marker: MapMarker) => void;
  isVip?: boolean;
  isAuthenticated?: boolean;
  currentUserId?: string; // ID текущего пользователя для проверки статуса дружбы
}

export function SolPointMap({
  markers,
  center = [35, 50],
  zoom = 3,
  onMarkerClick,
  isVip = false,
  isAuthenticated = false,
  currentUserId,
}: SolPointMapProps) {
  const [, setSelectedMarker] = useState<MapMarker | null>(null);
  const [worldGeoJson, setWorldGeoJson] = useState<GeoJsonObject | null>(null);
  const [citiesGeoJson, setCitiesGeoJson] = useState<GeoJsonObject | null>(null);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, "none" | "following" | "mutual">>({});
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [showProModal, setShowProModal] = useState(false);

  // Собираем страны и города
  const { countries, cities } = useMemo(() => {
    const countryMap = new Map<string, { name: string; lat: number; lng: number }>();
    const cityMap = new Map<string, { name: string; lat: number; lng: number; countryCode?: string }>();

    // Добавляем все страны из статического списка с их координатами
    COUNTRIES_STATIC.forEach((country) => {
      const center = COUNTRY_CENTERS[country.code];
      if (center && !countryMap.has(country.code)) {
        countryMap.set(country.code, {
          name: country.name,
          lat: center[0],
          lng: center[1],
        });
      }
    });

    // Добавляем крупные города из статического списка
    MAJOR_CITIES.forEach((city) => {
      const cityKey = `${city.name.toLowerCase()}-${city.countryCode}`;
      if (!cityMap.has(cityKey)) {
        cityMap.set(cityKey, {
          name: city.name,
          lat: city.lat,
          lng: city.lng,
          countryCode: city.countryCode,
        });
      }
    });

    // Также добавляем страны и города из маркеров
    markers.forEach((marker) => {
      if (!marker.latitude || !marker.longitude) return;

      const data = marker.data;
      let countryCode: string | undefined;
      let countryName: string | undefined;
      let cityName: string | undefined;

      // Получаем данные о стране и городе в зависимости от типа маркера
      if ("country_code" in data && data.country_code) {
        countryCode = data.country_code as string;
      }
      if ("country" in data && data.country) {
        countryName = data.country as string;
        if (!countryCode) {
          const country = COUNTRIES_STATIC.find(
            (c) => c.name.toLowerCase() === countryName!.toLowerCase()
          );
          if (country) {
            countryCode = country.code;
          }
        }
      }

      if ("city" in data && data.city) {
        cityName = data.city as string;
      }

      // Добавляем страну, если её нет в списке
      if (countryCode && !countryMap.has(countryCode)) {
        const center = COUNTRY_CENTERS[countryCode];
        if (center) {
          countryMap.set(countryCode, {
            name: countryName || countryCode,
            lat: center[0],
            lng: center[1],
          });
        } else {
          // Если нет координат в списке, используем координаты маркера
          countryMap.set(countryCode, {
            name: countryName || countryCode,
            lat: marker.latitude,
            lng: marker.longitude,
          });
        }
      }

      // Обрабатываем города из маркеров
      // Показываем только города, которые есть в MAJOR_CITIES
      if (cityName && cityName.trim()) {
        const cityKey = `${cityName.trim().toLowerCase()}-${countryCode || ""}`;
        
        // Проверяем, есть ли этот город в MAJOR_CITIES
        const majorCity = MAJOR_CITIES.find(
          (c) => c.name.toLowerCase() === cityName.trim().toLowerCase() && 
                 c.countryCode === countryCode
        );
        
        // Добавляем только если город есть в MAJOR_CITIES
        if (majorCity && !cityMap.has(cityKey)) {
          cityMap.set(cityKey, {
            name: majorCity.name,
            lat: majorCity.lat,
            lng: majorCity.lng,
            countryCode: majorCity.countryCode,
          });
        }
        // Города, которых нет в MAJOR_CITIES, не отображаются на карте
      }
    });

    return {
      countries: Array.from(countryMap.values()),
      cities: Array.from(cityMap.values()),
    };
  }, [markers]);

  // Load GeoJSON data for world countries
  useEffect(() => {
    fetch("/world.geo.json")
      .then((response) => response.json())
      .then((data) => {
        setWorldGeoJson(data as GeoJsonObject);
      })
      .catch((error) => {
        console.error("Failed to load world GeoJSON:", error);
      });
  }, []);

  // Load GeoJSON data for city boundaries (only at zoom >= 6, load once)
  useEffect(() => {
    // Если уже загружено, не загружаем повторно
    if (citiesGeoJson) {
      return;
    }

    if (currentZoom < 6) {
      return;
    }

    // Загружаем файл только один раз при первом приближении
    fetch("/cities.json")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load cities GeoJSON");
        return response.json();
      })
      .then((data) => {
        // Фильтруем записи с null geometry
        if (data.features) {
          data.features = data.features.filter(
            (feature: any) => feature.geometry !== null
          );
        }
        setCitiesGeoJson(data as GeoJsonObject);
      })
      .catch((error) => {
        console.error("Failed to load cities GeoJSON:", error);
        // Не устанавливаем null, чтобы не пытаться загрузить повторно при ошибке
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentZoom]); // citiesGeoJson не в зависимостях, чтобы избежать повторных загрузок

  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      trackEvent("map_marker_click", {
        event_category: "Map",
        marker_type: marker.type,
        marker_id: marker.id,
        marker_name: marker.name || marker.title || "",
        country: marker.country,
        city: marker.city,
      });
      setSelectedMarker(marker);
      onMarkerClick?.(marker);
    },
    [onMarkerClick]
  );

  // Проверяем статус дружбы для пользователей
  useEffect(() => {
    if (!currentUserId || !isAuthenticated) {
      return;
    }

    const checkFriendshipStatuses = async () => {
      const userMarkers = markers.filter(
        (m) => m.type === "user" || m.type === "pro_user"
      );

      if (userMarkers.length === 0) {
        return;
      }

      const userIds = userMarkers.map((m) => (m.data as User).id);

      try {
        const response = await fetch("/api/friends/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_ids: userIds }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { statuses } = await response.json();
        setFriendshipStatuses(statuses || {});
      } catch (error) {
        console.error("Error checking friendship statuses:", error);
        setFriendshipStatuses({});
      }
    };

    checkFriendshipStatuses();
  }, [markers, currentUserId, isAuthenticated]);

  const getIcon = (marker: MapMarker) => {
    switch (marker.type) {
      case "hub":
        return createHubIcon();
      case "workspace":
        return createWorkspaceIcon();
      case "community":
        return createCommunityIcon();
      case "project":
        return createProjectIcon();
      case "event":
        return createEventIcon();
      case "user":
      case "pro_user":
        return createCustomIcon(marker.type, marker.data as User);
      default:
        return createCustomIcon(marker.type);
    }
  };

  const handleAddFriend = useCallback(async (userId: string) => {
    if (!isAuthenticated || !currentUserId) {
      return;
    }

    try {
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ friend_id: userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add friend");
      }

      // Обновляем статус подписки
      if (data.data?.isMutual || data.data?.status === "mutual") {
        setFriendshipStatuses((prev) => ({
          ...prev,
          [userId]: "mutual",
        }));
      } else {
        setFriendshipStatuses((prev) => ({
          ...prev,
          [userId]: "following",
        }));
      }
    } catch (error) {
      console.error("Error adding friend:", error);
      alert(error instanceof Error ? error.message : "Failed to add friend");
    }
  }, [isAuthenticated, currentUserId]);

  const handleRemoveFriend = useCallback(async (userId: string) => {
    if (!isAuthenticated || !currentUserId) {
      return;
    }

    try {
      const response = await fetch(`/api/friends?friend_id=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove friend");
      }

      // После отписки статус становится "none"
      setFriendshipStatuses((prev) => ({
        ...prev,
        [userId]: "none",
      }));
    } catch (error) {
      console.error("Error removing friend:", error);
      alert(error instanceof Error ? error.message : "Failed to remove friend");
    }
  }, [isAuthenticated, currentUserId]);

  const renderPopupContent = (marker: MapMarker) => {
    switch (marker.type) {
      case "user":
      case "pro_user": {
        // Если пользователь не авторизован, не показываем попап с UserCard
        if (!isAuthenticated) {
          return (
            <div className="p-4 text-center">
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                Sign up or log in to view user profiles
              </p>
              <div className="flex gap-2 justify-center">
                <a
                  href="/signup"
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                >
                  Sign up
                </a>
                <a
                  href="/login"
                  className="px-4 py-2 border border-[var(--color-surface-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-sm"
                >
                  Log in
                </a>
              </div>
            </div>
          );
        }
        
        const user = marker.data as User;
        const friendshipStatus = friendshipStatuses[user.id] || "none";
        const isFriend = friendshipStatus === "mutual";
        
        // Преобразуем статус из формата карты в формат для UserCard
        let cardFriendshipStatus: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked" = "none";
        if (friendshipStatus === "mutual") {
          cardFriendshipStatus = "accepted";
        } else if (friendshipStatus === "following") {
          cardFriendshipStatus = "pending_sent";
        }
        
        return (
          <UserCard
            user={user}
            isVip={user.subscription_tier === "vip"}
            compact
            isFriend={isFriend}
            friendshipStatus={cardFriendshipStatus}
            onAddFriend={friendshipStatus === "none" ? () => handleAddFriend(user.id) : undefined}
            onRemoveFriend={friendshipStatus === "following" || friendshipStatus === "mutual" ? () => handleRemoveFriend(user.id) : undefined}
            currentUserId={currentUserId}
            onProfileClick={(e) => {
              if (isAuthenticated && !isVip) {
                e.preventDefault();
                setShowProModal(true);
              }
            }}
          />
        );
      }
      case "event":
        return <EventCard event={marker.data as Event} isVip={isVip} isAuthenticated={isAuthenticated} compact isBlurred={!isAuthenticated} />;
      case "hub":
        return <HubCard hub={marker.data as Hub} compact entityType="hub" isBlurred={!isAuthenticated} />;
      case "workspace":
        return <HubCard hub={marker.data as Workspace} compact entityType="workspace" isBlurred={!isAuthenticated} />;
      case "community":
        return <HubCard hub={marker.data as Community} compact entityType="community" isBlurred={!isAuthenticated} />;
      case "project":
        return <HubCard hub={marker.data as Project} compact entityType="project" isBlurred={!isAuthenticated} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full rounded-xl overflow-hidden solpoint-map-container"
        style={{ background: "#18E3C5" }}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        attributionControl={false}
      >
        {/* GeoJSON layer with custom colors from Figma */}
        {worldGeoJson && (
          <GeoJSON
            data={worldGeoJson}
            style={(feature) => {
              // Более детальная визуализация в зависимости от зума
              const baseWeight = currentZoom < 5 ? 1.5 : currentZoom < 7 ? 1.2 : 1;
              return {
                fillColor: "#452D9F", // Фиолетовый для материков
                fillOpacity: 0.9,
                color: currentZoom >= 5 ? "#8B7EC8" : "#A4E3B4", // Более темные границы при приближении
                weight: baseWeight,
                opacity: 1,
              };
            }}
            eventHandlers={{
              mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                  fillOpacity: 0.85,
                  weight: currentZoom >= 5 ? 1.5 : 2,
                  color: "#C4B5FD",
                });
              },
              mouseout: (e) => {
                const layer = e.target;
                const baseWeight = currentZoom < 5 ? 1.5 : currentZoom < 7 ? 1.2 : 1;
                layer.setStyle({
                  fillOpacity: 0.9,
                  weight: baseWeight,
                  color: currentZoom >= 5 ? "#8B7EC8" : "#A4E3B4",
                });
              },
            }}
          />
        )}

        {/* City boundaries layer - черные границы городов */}
        {currentZoom >= 6 && citiesGeoJson && (
          <GeoJSON
            data={citiesGeoJson}
            // smoothFactor={1.5} // Сглаживание линий для более плавных углов
            style={() => {
              return {
                fillColor: "transparent", // Прозрачная заливка
                fillOpacity: 0, // Без заливки
                color: "#000000", // Черные границы
                weight: 0.8, // Тонкие линии
                opacity: 0.7, // Немного прозрачные
              };
            }}
            interactive={false} // Не реагируют на клики
          />
        )}

        <MapController center={center} zoom={zoom} />
        <ZoomTracker onZoomChange={setCurrentZoom} />

        {/* Названия стран (при малом зуме < 5) */}
        {currentZoom < 5 &&
          countries.map((country, index) => (
            <Marker
              key={`country-${index}`}
              position={[country.lat, country.lng]}
              icon={createTextLabel(country.name, 16)}
              interactive={false}
            />
          ))}

        {/* Названия городов (при большом зуме >= 5) */}
        {currentZoom >= 5 &&
          cities.map((city, index) => (
            <Marker
              key={`city-${index}`}
              position={[city.lat, city.lng]}
              icon={createTextLabel(city.name, 14)}
              interactive={false}
            />
          ))}

        {markers
          .filter((marker) => {
            // Фильтруем маркеры с валидными координатами
            return (
              marker.latitude != null &&
              marker.longitude != null &&
              !isNaN(marker.latitude) &&
              !isNaN(marker.longitude) &&
              marker.latitude >= -90 &&
              marker.latitude <= 90 &&
              marker.longitude >= -180 &&
              marker.longitude <= 180
            );
          })
          .map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
              icon={getIcon(marker)}
              eventHandlers={{
                click: () => handleMarkerClick(marker),
              }}
            >
              <Popup
                className="solpoint-popup"
                closeButton={true}
                autoPan={true}
                maxWidth={350}
                minWidth={280}
              >
                {renderPopupContent(marker)}
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Custom styles for markers and map */}
      <style jsx global>{`
        .custom-marker {
          background: transparent;
          border: none;
        }
        
        .custom-marker img {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }
        
        /* User markers styling */
        .user-marker {
          filter: drop-shadow(0 2px 4px rgba(239, 68, 68, 0.4));
        }
        
        .pro-user-marker {
          filter: drop-shadow(0 2px 4px rgba(251, 191, 36, 0.4));
        }
        
        .solpoint-popup .leaflet-popup-content-wrapper {
          background: var(--color-surface);
          color: var(--color-foreground);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          border: 1px solid var(--color-surface-border);
          padding: 0;
        }
        
        .solpoint-popup .leaflet-popup-content {
          margin: 0;
          min-width: 280px;
        }
        
        .solpoint-popup .leaflet-popup-tip {
          background: var(--color-surface);
          border-left: 1px solid var(--color-surface-border);
          border-bottom: 1px solid var(--color-surface-border);
        }
        
        .solpoint-popup .leaflet-popup-close-button {
          color: var(--color-text-muted);
          font-size: 20px;
          top: 8px;
          right: 8px;
        }
        
        .solpoint-popup .leaflet-popup-close-button:hover {
          color: var(--color-text-primary);
        }
        
        .leaflet-control-zoom {
          border: 1px solid var(--color-surface-border) !important;
          border-radius: 8px !important;
          overflow: hidden;
          z-index: 999 !important;
        }
        
        .leaflet-control-zoom a {
          background: var(--color-surface) !important;
          color: var(--color-text-primary) !important;
          border-bottom: 1px solid var(--color-surface-border) !important;
        }
        
        .leaflet-control-zoom a:hover {
          background: var(--color-surface-hover) !important;
        }
        
        .leaflet-control-zoom a:last-child {
          border-bottom: none !important;
        }
        
        .leaflet-control-attribution {
          display: none !important;
        }
      `}</style>
      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description="Viewing user profiles is available only with PRO subscription. Upgrade to PRO to unlock this feature."
      />
    </div>
  );
}

