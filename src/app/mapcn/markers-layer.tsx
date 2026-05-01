"use client";

import { useEffect, useState, useCallback, useMemo, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useMap, MapMarker as MapMarkerComponent, MarkerContent, MarkerPopup } from "@/components/ui/map";
import type { MapMarker, User, Event, Hub, Community, Workspace } from "@/types";
import { AttendeeStyleProfileCard } from "@/components/events/attendee-style-profile-card";
import { EventCard } from "@/components/cards/event-card";
import { HubCard } from "@/components/cards/hub-card";
import { trackEvent } from "@/lib/analytics";
import { USER_ROLE_LABELS } from "@/lib/profile-taxonomy";
import { AuthRequiredModal } from "@/components/ui";

interface MapMarkersLayerProps {
  markers: MapMarker[];
  isAuthenticated?: boolean;
  currentUserId?: string;
}

interface Cluster {
  id: string;
  latitude: number;
  longitude: number;
  markers: MapMarker[];
  count: number;
  type: MapMarker["type"]; // Тип маркеров в кластере
}

// Функция для вычисления расстояния между двумя точками в пикселях на карте
// Использует проекцию Web Mercator для более точных вычислений
function getPixelDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  zoom: number
): number {
  // Проекция Web Mercator для преобразования географических координат в пиксели
  function latToY(lat: number, zoom: number): number {
    const n = Math.pow(2, zoom);
    const latRad = (lat * Math.PI) / 180;
    const y = n * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
    return y * 256;
  }

  function lngToX(lng: number, zoom: number): number {
    const n = Math.pow(2, zoom);
    const x = n * ((lng + 180) / 360);
    return x * 256;
  }

  const x1 = lngToX(lng1, zoom);
  const y1 = latToY(lat1, zoom);
  const x2 = lngToX(lng2, zoom);
  const y2 = latToY(lat2, zoom);

  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Функция кластеризации маркеров одного типа
function clusterMarkersByType(
  markers: MapMarker[],
  zoom: number,
  clusterRadius: number = 60,
  clusterType?: MapMarker["type"] // Тип для кластера (может отличаться от типа маркеров, если мы объединяем типы)
): (MapMarker | Cluster)[] {
  if (markers.length === 0) return [];
  
  const clusters: Cluster[] = [];
  const processed = new Set<string>();
  
  markers.forEach((marker, index) => {
    if (processed.has(marker.id)) return;
    
    // Ищем близкие маркеры ТОГО ЖЕ ТИПА для кластеризации
    // Если передан clusterType, используем его для всех маркеров в этой группе
    const nearbyMarkers: MapMarker[] = [marker];
    const clusterLatitudes: number[] = [marker.latitude];
    const clusterLongitudes: number[] = [marker.longitude];
    
    for (let i = index + 1; i < markers.length; i++) {
      const otherMarker = markers[i];
      if (processed.has(otherMarker.id)) continue;
      
      // Если передан clusterType, не проверяем тип (все маркеры уже одного типа группы)
      // Иначе проверяем точное совпадение типа
      if (!clusterType && marker.type !== otherMarker.type) continue;
      
      const distance = getPixelDistance(
        marker.latitude,
        marker.longitude,
        otherMarker.latitude,
        otherMarker.longitude,
        zoom
      );
      
      if (distance <= clusterRadius) {
        nearbyMarkers.push(otherMarker);
        clusterLatitudes.push(otherMarker.latitude);
        clusterLongitudes.push(otherMarker.longitude);
        processed.add(otherMarker.id);
      }
    }
    
    // Если найдено больше одного маркера, создаем кластер
    if (nearbyMarkers.length > 1) {
      // Вычисляем центр кластера как среднее арифметическое координат
      const avgLat = clusterLatitudes.reduce((a, b) => a + b, 0) / clusterLatitudes.length;
      const avgLng = clusterLongitudes.reduce((a, b) => a + b, 0) / clusterLongitudes.length;
      
      clusters.push({
        id: `cluster-${clusterType || marker.type}-${marker.id}`,
        latitude: avgLat,
        longitude: avgLng,
        markers: nearbyMarkers,
        count: nearbyMarkers.length,
        type: clusterType || marker.type, // Используем clusterType, если он передан
      });
      processed.add(marker.id);
    } else {
      // Одиночный маркер не попадает в кластер
      processed.add(marker.id);
    }
  });
  
  // Собираем результат: кластеры + одиночные маркеры
  const result: (MapMarker | Cluster)[] = [];
  const clusteredMarkerIds = new Set<string>();
  
  clusters.forEach((cluster) => {
    result.push(cluster);
    cluster.markers.forEach((m) => clusteredMarkerIds.add(m.id));
  });
  
  markers.forEach((marker) => {
    if (!clusteredMarkerIds.has(marker.id)) {
      result.push(marker);
    }
  });
  
  return result;
}

// Функция кластеризации маркеров (группирует по типам)
function clusterMarkers(
  markers: MapMarker[],
  zoom: number,
  clusterRadius: number = 60
): (MapMarker | Cluster)[] {
  if (markers.length === 0) return [];
  
  // При большом зуме (близко) не кластеризуем
  if (zoom >= 12) {
    return markers;
  }
  
  // Фильтруем только маркеры с валидными координатами
  const validMarkers = markers.filter((marker) => {
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
  });
  
  // Группируем маркеры по типам
  const markersByType = new Map<MapMarker["type"], { markers: MapMarker[]; clusterType: MapMarker["type"] }>();
  
  validMarkers.forEach((marker) => {
    // Объединяем user и pro_user в одну группу "user" для кластеризации
    const clusterType = marker.type === "pro_user" ? "user" : marker.type;
    
    if (!markersByType.has(clusterType)) {
      markersByType.set(clusterType, { markers: [], clusterType });
    }
    markersByType.get(clusterType)!.markers.push(marker);
  });
  
  // Кластеризуем каждый тип отдельно
  const result: (MapMarker | Cluster)[] = [];
  
  markersByType.forEach(({ markers: typeMarkers, clusterType }) => {
    const clustered = clusterMarkersByType(typeMarkers, zoom, clusterRadius, clusterType);
    result.push(...clustered);
  });
  
  return result;
}

// Компонент для отображения иконки маркера
const MarkerIcon = ({
  type,
  user,
  event,
}: {
  type: MapMarker["type"];
  user?: User;
  event?: Event;
}) => {
  let imgSrc = "";
  let filterStyle = "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))";

  // Circular event marker with image and rings
  if (type === "event") {
    const imageUrl = event?.image_url || "";
    const filterGlow = "drop-shadow(0 4px 12px rgba(20, 241, 149, 0.55))";
    const outerSize = 68;
    const mainSize = 52;

    return (
      <div
        style={{
          width: `${outerSize}px`,
          height: `${outerSize}px`,
          position: "relative",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: filterGlow,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          animation: "cluster-appear 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15) translateY(-2px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1) translateY(0)"; }}
      >
        {/* Outer pulsing ring */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: `${outerSize}px`,
          height: `${outerSize}px`,
          borderRadius: "50%",
          border: "1.5px solid rgba(20,241,149,0.3)",
          animation: "cluster-pulse 2s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        {/* Middle ring */}
        <div style={{
          position: "absolute",
          width: `${mainSize + 10}px`,
          height: `${mainSize + 10}px`,
          borderRadius: "50%",
          border: "1.5px solid rgba(20,241,149,0.55)",
          pointerEvents: "none",
        }} />
        {/* Main circle with image */}
        <div style={{
          width: `${mainSize}px`,
          height: `${mainSize}px`,
          borderRadius: "50%",
          border: "2px solid #14f195",
          overflow: "hidden",
          background: "#111820",
          flexShrink: 0,
          position: "relative",
        }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={event?.name || "event"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%",
              height: "100%",
              background: "rgba(20,241,149,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}>
              📅
            </div>
          )}
        </div>
      </div>
    );
  }

  // For user markers, create SVG with avatar
  if (type === "user" || type === "pro_user") {
    const avatarUrl = user?.avatar_url || "";
    const clipId = user?.id ? `avatar-clip-${user.id.replace(/[^a-zA-Z0-9]/g, '-')}` : 'avatar-clip-default';
    const escapedAvatarUrl = avatarUrl ? avatarUrl.replace(/"/g, '&quot;') : '';
    
    // No glow for user pins (per design)
    filterStyle = "none";
    
    const svg = `
      <svg width="43" height="55" viewBox="0 0 43 55" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <path d="M21.5 0.5C33.1091 0.5 42.5 9.68919 42.5 21C42.5 22.3816 42.3604 23.7309 42.0938 25.0352L42.0898 25.0518L42.0879 25.0684C41.1607 31.8933 36.0099 39.2624 31.0098 44.9766C28.5206 47.8212 26.0895 50.233 24.2803 51.9336C23.3761 52.7835 22.628 53.4553 22.1064 53.9141C21.9082 54.0885 21.7411 54.2309 21.6123 54.3418C21.5099 54.2537 21.384 54.1451 21.2373 54.0166C20.789 53.6241 20.1426 53.0479 19.3545 52.3154C17.7779 50.8502 15.6346 48.761 13.3672 46.2666C8.81894 41.263 3.82333 34.6832 1.85449 28.2627L1.84961 28.2461L1.84277 28.2295C0.974829 25.9817 0.5 23.5455 0.5 21C0.5 9.68919 9.89086 0.5 21.5 0.5Z" fill="black" stroke="#16F196"/>
        ${avatarUrl ? `
          <defs>
            <clipPath id="${clipId}">
              <rect x="4" y="4" width="35" height="35" rx="17.5" />
            </clipPath>
          </defs>
          <image xlink:href="${escapedAvatarUrl}" x="4" y="4" width="35" height="35" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>
        ` : `
          <circle cx="21.5" cy="21.5" r="17.5" fill="#16F196"/>
          <path d="M32 30.25V27.75C32 26.4239 31.4732 25.1522 30.5355 24.2145C29.5979 23.2768 28.3261 22.75 27 22.75H17C15.6739 22.75 14.4021 23.2768 13.4645 24.2145C12.5268 25.1522 12 26.4239 12 27.75V30.25M27 12.75C27 15.5114 24.7614 17.75 22 17.75C19.2386 17.75 17 15.5114 17 12.75C17 9.98858 19.2386 7.75 22 7.75C24.7614 7.75 27 9.98858 27 12.75Z" stroke="#1E1E1E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        `}
      </svg>
    `;

    return (
      <div
        style={{
          width: "43px",
          height: "55px",
          cursor: "pointer",
          filter: filterStyle,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          animation: "cluster-appear 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.15) translateY(-2px)";
          // keep filter unchanged (no glow)
          e.currentTarget.style.filter = filterStyle;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1) translateY(0)";
          e.currentTarget.style.filter = filterStyle;
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  // Event markers: render the same "cluster" circular look with pulse,
  // but with the event logo in the center (no clustering).
  if (type === "event") {
    const borderColor = "#14f195";
    const size = 52;
    const logoSize = 40;
    const eventLogoUrl = event?.image_url || "";

    return (
      <div
        style={{
          position: "relative",
          width: `${size}px`,
          height: `${size}px`,
          animation: "cluster-appear 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: `${size + 8}px`,
            height: `${size + 8}px`,
            borderRadius: "50%",
            border: `2px solid ${borderColor}`,
            animation: "cluster-pulse 2s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #111820 0%, #182028 100%)",
            border: `2px solid ${borderColor}`,
            boxShadow: `
              0 4px 12px rgba(0, 0, 0, 0.5),
              0 0 0 3px ${borderColor}20,
              inset 0 1px 0 ${borderColor}40
            `,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "10%",
              left: "10%",
              right: "10%",
              bottom: "10%",
              borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${borderColor}15 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
          {eventLogoUrl ? (
            <img
              src={eventLogoUrl}
              alt={event?.name || "Event"}
              style={{
                width: `${logoSize}px`,
                height: `${logoSize}px`,
                borderRadius: "9999px",
                objectFit: "cover",
                position: "relative",
                zIndex: 1,
                background: "#0B0B0B",
              }}
            />
          ) : (
            // Fallback: small calendar glyph
            <svg
              width={logoSize}
              height={logoSize}
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ position: "relative", zIndex: 1 }}
            >
              <rect x="3" y="5" width="16" height="14" rx="2" stroke={borderColor} strokeWidth="2" />
              <line x1="3" y1="8" x2="19" y2="8" stroke={borderColor} strokeWidth="2" />
              <line x1="7" y1="3" x2="7" y2="6" stroke={borderColor} strokeWidth="2" strokeLinecap="round" />
              <line x1="15" y1="3" x2="15" y2="6" stroke={borderColor} strokeWidth="2" strokeLinecap="round" />
              <circle cx="7" cy="12" r="1.3" fill={borderColor} />
              <circle cx="11" cy="12" r="1.3" fill={borderColor} />
              <circle cx="15" cy="12" r="1.3" fill={borderColor} />
              <circle cx="7" cy="16" r="1.3" fill={borderColor} />
            </svg>
          )}
        </div>
      </div>
    );
  }

  // For other marker types, use existing images
  switch (type) {
    case "hub":
      imgSrc = "/hub-pin.svg";
      filterStyle = "drop-shadow(0 4px 8px rgba(20, 241, 149, 0.4))";
      break;
    case "workspace":
      imgSrc = "/workspace-pin.svg";
      filterStyle = "drop-shadow(0 4px 8px rgba(20, 241, 149, 0.4))";
      break;
    case "community":
      imgSrc = "/community-pin.svg";
      filterStyle = "drop-shadow(0 4px 8px rgba(20, 241, 149, 0.4))";
      break;
    case "project":
      imgSrc = "/project-pin.svg";
      filterStyle = "drop-shadow(0 4px 8px rgba(20, 241, 149, 0.4))";
      break;
    default:
      imgSrc = "/free-user-pin.svg";
  }

  return (
    <div
      style={{
        width: "46px",
        height: "54px",
        cursor: "pointer",
        filter: filterStyle,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        animation: "cluster-appear 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.15) translateY(-2px)";
        e.currentTarget.style.filter = filterStyle.replace(/rgba\(([^)]+)\)/g, (match, rgba) => {
          const [r, g, b] = rgba.split(',').slice(0, 3);
          return `rgba(${r}, ${g}, ${b}, 0.7)`;
        });
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1) translateY(0)";
        e.currentTarget.style.filter = filterStyle;
      }}
    >
      <img
        src={imgSrc}
        alt={type}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
};

// Компонент для отображения кластера
const ClusterIcon = ({ count, type }: { count: number; type: MapMarker["type"] }) => {
  // Определяем размер кластера в зависимости от количества маркеров
  const size = count < 10 ? 52 : count < 100 ? 62 : 72;
  const fontSize = count < 10 ? 14 : count < 100 ? 16 : 18;
  const iconSize = count < 10 ? 18 : count < 100 ? 22 : 26;
  
  // Определяем цвет и иконку кластера в зависимости от типа (используем зеленый Solana для всех)
  const borderColor = "#14f195"; // Зеленый Solana
  let iconSrc = "";
  
  switch (type) {
    case "user":
    case "pro_user":
      iconSrc = "/users-cluster.svg"; // Специальная иконка людей в круге
      break;
    case "event":
      iconSrc = "/event-pin.svg";
      break;
    case "hub":
      iconSrc = "/hub-pin.svg";
      break;
    case "workspace":
      iconSrc = "/workspace-pin.svg";
      break;
    case "community":
      iconSrc = "/community-pin.svg";
      break;
    case "project":
      iconSrc = "/project-pin.svg";
      break;
    default:
      break;
  }
  
  return (
    <div
      style={{
        position: "relative",
        width: `${size}px`,
        height: `${size}px`,
        animation: "cluster-appear 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Пульсирующее кольцо */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `${size + 8}px`,
          height: `${size + 8}px`,
          borderRadius: "50%",
          border: `2px solid ${borderColor}`,
          animation: "cluster-pulse 2s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      
      {/* Основной кластер */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: `linear-gradient(135deg, #111820 0%, #182028 100%)`,
          border: `2px solid ${borderColor}`,
          boxShadow: `
            0 4px 12px rgba(0, 0, 0, 0.5),
            0 0 0 3px ${borderColor}20,
            inset 0 1px 0 ${borderColor}40
          `,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#14f195",
          fontWeight: "bold",
          fontSize: `${fontSize}px`,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = `
            0 6px 20px rgba(0, 0, 0, 0.6),
            0 0 0 4px ${borderColor}30,
            0 0 20px ${borderColor}60,
            inset 0 1px 0 ${borderColor}60
          `;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = `
            0 4px 12px rgba(0, 0, 0, 0.5),
            0 0 0 3px ${borderColor}20,
            inset 0 1px 0 ${borderColor}40
          `;
        }}
      >
      {/* Внутреннее свечение */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "10%",
          right: "10%",
          bottom: "10%",
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 30%, ${borderColor}15 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      
      {/* Иконка типа маркера */}
      {iconSrc && (
        <img
          src={iconSrc}
          alt={type}
          style={{
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            marginBottom: "2px",
            filter: `drop-shadow(0 0 4px ${borderColor}60)`,
            position: "relative",
            zIndex: 1,
            opacity: 0.9,
          }}
        />
      )}
      
      {/* Количество маркеров */}
      <div 
        style={{ 
          lineHeight: 1, 
          marginTop: iconSrc ? "2px" : "0",
          position: "relative",
          zIndex: 1,
          textShadow: `0 0 8px ${borderColor}80, 0 1px 2px rgba(0,0,0,0.5)`,
        }}
      >
        {count}
      </div>
      </div>
    </div>
  );
};

// Dimensions of the user profile card used for smart popup positioning
const USER_CARD_WIDTH = 290;
const USER_CARD_HEIGHT = 460;
const USER_PIN_HEIGHT = 55;
const USER_PIN_HALF_WIDTH = 22;
const CARD_OFFSET = 14;

// Dimensions of the event compact card used for smart popup positioning
const EVENT_CARD_WIDTH = 256;
const EVENT_CARD_HEIGHT = 374;
const EVENT_PIN_HEIGHT = 52;
const EVENT_PIN_HALF_WIDTH = 26;

type UserCardState = {
  user: User;
  style: CSSProperties;
};

type EventCardState = {
  event: Event;
  style: CSSProperties;
};

export function MapMarkersLayer({
  markers,
  isAuthenticated = false,
  currentUserId,
}: MapMarkersLayerProps) {
  const { map, isLoaded } = useMap();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState("Log in or Sign up to continue");
  const [authRedirectTo, setAuthRedirectTo] = useState<string | undefined>(undefined);

  // Custom overlay state for authenticated user cards (replaces MapLibre popup)
  const [userCard, setUserCard] = useState<UserCardState | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Custom overlay state for event cards (replaces MapLibre popup)
  const [eventCard, setEventCard] = useState<EventCardState | null>(null);
  const eventCardRef = useRef<HTMLDivElement>(null);

  const visibleMarkers = useMemo(() => {
    return markers.filter((marker) => {
      // Only users and events are shown on this map
      if (marker.type === "hub" || marker.type === "community" || marker.type === "workspace") {
        return false;
      }
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
    });
  }, [markers]);

  // Calculate the best position for the user card so it stays fully inside the map container
  const openUserCard = useCallback(
    (marker: MapMarker) => {
      if (!map) return;

      const pixel = map.project([marker.longitude, marker.latitude]);
      const container = map.getContainer();
      const mapWidth = container.clientWidth;
      const mapHeight = container.clientHeight;

      const x = pixel.x; // pin tip x (pin is centered horizontally)
      const y = pixel.y; // pin tip y (anchor="bottom", so tip is at the coordinate)

      // Available space in each direction
      const spaceAbove = y - USER_PIN_HEIGHT; // from pin icon top to map top
      const spaceBelow = mapHeight - y; // from pin tip to map bottom
      const spaceRight = mapWidth - x; // from pin center to map right
      const spaceLeft = x; // from map left to pin center

      const clampH = (left: number) =>
        Math.max(8, Math.min(left, mapWidth - USER_CARD_WIDTH - 8));
      const clampV = (top: number) =>
        Math.max(8, Math.min(top, mapHeight - USER_CARD_HEIGHT - 8));

      const pinCenterY = y - USER_PIN_HEIGHT / 2;

      let style: CSSProperties = {
        position: "absolute",
        width: USER_CARD_WIDTH,
        zIndex: 400,
      };

      if (spaceAbove >= USER_CARD_HEIGHT + CARD_OFFSET) {
        // Enough space above: show card above the pin
        style.left = clampH(x - USER_CARD_WIDTH / 2);
        style.top = y - USER_PIN_HEIGHT - CARD_OFFSET - USER_CARD_HEIGHT;
      } else if (spaceRight >= USER_CARD_WIDTH + USER_PIN_HALF_WIDTH + CARD_OFFSET) {
        // Enough space to the right
        style.left = x + USER_PIN_HALF_WIDTH + CARD_OFFSET;
        style.top = clampV(pinCenterY - USER_CARD_HEIGHT / 2);
      } else if (spaceLeft >= USER_CARD_WIDTH + USER_PIN_HALF_WIDTH + CARD_OFFSET) {
        // Enough space to the left
        style.left = x - USER_PIN_HALF_WIDTH - CARD_OFFSET - USER_CARD_WIDTH;
        style.top = clampV(pinCenterY - USER_CARD_HEIGHT / 2);
      } else if (spaceBelow >= USER_CARD_HEIGHT + CARD_OFFSET) {
        // Enough space below: show card below the pin tip
        style.left = clampH(x - USER_CARD_WIDTH / 2);
        style.top = y + CARD_OFFSET;
      } else {
        // Best effort: above with clamping to map bounds
        style.left = clampH(x - USER_CARD_WIDTH / 2);
        style.top = Math.max(8, y - USER_PIN_HEIGHT - CARD_OFFSET - USER_CARD_HEIGHT);
      }

      const user = marker.data as User;
      setUserCard({ user, style });
    },
    [map]
  );

  // Calculate the best position for the event card so it stays fully inside the map container
  const openEventCard = useCallback(
    (marker: MapMarker) => {
      if (!map) return;

      const pixel = map.project([marker.longitude, marker.latitude]);
      const container = map.getContainer();
      const mapWidth = container.clientWidth;
      const mapHeight = container.clientHeight;

      const x = pixel.x;
      const y = pixel.y;

      const spaceAbove = y - EVENT_PIN_HEIGHT;
      const spaceBelow = mapHeight - y;
      const spaceRight = mapWidth - x;
      const spaceLeft = x;

      const clampH = (left: number) =>
        Math.max(8, Math.min(left, mapWidth - EVENT_CARD_WIDTH - 8));
      const clampV = (top: number) =>
        Math.max(8, Math.min(top, mapHeight - EVENT_CARD_HEIGHT - 8));

      const pinCenterY = y - EVENT_PIN_HEIGHT / 2;

      let style: CSSProperties = {
        position: "absolute",
        width: EVENT_CARD_WIDTH,
        zIndex: 400,
      };

      if (spaceAbove >= EVENT_CARD_HEIGHT + CARD_OFFSET) {
        style.left = clampH(x - EVENT_CARD_WIDTH / 2);
        style.top = y - EVENT_PIN_HEIGHT - CARD_OFFSET - EVENT_CARD_HEIGHT;
      } else if (spaceRight >= EVENT_CARD_WIDTH + EVENT_PIN_HALF_WIDTH + CARD_OFFSET) {
        style.left = x + EVENT_PIN_HALF_WIDTH + CARD_OFFSET;
        style.top = clampV(pinCenterY - EVENT_CARD_HEIGHT / 2);
      } else if (spaceLeft >= EVENT_CARD_WIDTH + EVENT_PIN_HALF_WIDTH + CARD_OFFSET) {
        style.left = x - EVENT_PIN_HALF_WIDTH - CARD_OFFSET - EVENT_CARD_WIDTH;
        style.top = clampV(pinCenterY - EVENT_CARD_HEIGHT / 2);
      } else if (spaceBelow >= EVENT_CARD_HEIGHT + CARD_OFFSET) {
        style.left = clampH(x - EVENT_CARD_WIDTH / 2);
        style.top = y + CARD_OFFSET;
      } else {
        style.left = clampH(x - EVENT_CARD_WIDTH / 2);
        style.top = Math.max(8, y - EVENT_PIN_HEIGHT - CARD_OFFSET - EVENT_CARD_HEIGHT);
      }

      const event = marker.data as Event;
      setEventCard({ event, style });
    },
    [map]
  );

  // Close user card when clicking outside it
  useEffect(() => {
    if (!userCard) return;

    const handleDocClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setUserCard(null);
      }
    };

    // Defer so the opening click doesn't immediately close the card
    const timerId = setTimeout(() => {
      document.addEventListener("mousedown", handleDocClick);
    }, 0);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener("mousedown", handleDocClick);
    };
  }, [userCard]);

  // Close event card when clicking outside it
  useEffect(() => {
    if (!eventCard) return;

    const handleDocClick = (e: MouseEvent) => {
      if (eventCardRef.current && !eventCardRef.current.contains(e.target as Node)) {
        setEventCard(null);
      }
    };

    const timerId = setTimeout(() => {
      document.addEventListener("mousedown", handleDocClick);
    }, 0);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener("mousedown", handleDocClick);
    };
  }, [eventCard]);

  // Close cards when the map is dragged (position becomes stale).
  // We intentionally do NOT close on zoomstart/zoom because scroll-wheel and
  // trackpad zooming fire zoomstart on every step, which would close a card
  // that was just opened between two consecutive scroll ticks.
  useEffect(() => {
    if (!map) return;
    const close = () => {
      setUserCard(null);
      setEventCard(null);
    };
    map.on("dragstart", close);
    return () => {
      map.off("dragstart", close);
    };
  }, [map]);

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
    },
    []
  );

  // Clusters are intentionally disabled for this map.

  const renderPopupContent = (marker: MapMarker) => {
    switch (marker.type) {
      case "user":
      case "pro_user": {
        // User markers are handled by custom overlay (auth) or auth modal (guest)
        return null;
      }
      case "event":
        // Event markers are handled by custom overlay (auth) or auth modal (guest)
        return null;
      case "hub":
        return (
          <HubCard
            hub={marker.data as Hub}
            compact
            entityType="hub"
            isBlurred={!isAuthenticated}
          />
        );
      case "workspace":
        return (
          <HubCard
            hub={marker.data as Workspace}
            compact
            entityType="workspace"
            isBlurred={!isAuthenticated}
          />
        );
      case "community":
        return (
          <HubCard
            hub={marker.data as Community}
            compact
            entityType="community"
            isBlurred={!isAuthenticated}
          />
        );
      default:
        return null;
    }
  };

  if (!isLoaded || !map) {
    return null;
  }

  const isUserMarker = (m: MapMarker) => m.type === "user" || m.type === "pro_user";

  // Build the user card portal overlay (rendered directly inside the map container
  // so absolute positioning is relative to the map bounds).
  const mapContainer = map.getContainer();

  const eventCardPortal =
    eventCard && mapContainer
      ? createPortal(
          <div
            ref={eventCardRef}
            style={eventCard.style}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <EventCard
              event={eventCard.event}
              isAuthenticated={isAuthenticated}
              compact
              isBlurred={!isAuthenticated}
            />
          </div>,
          mapContainer
        )
      : null;

  const userCardPortal =
    userCard && mapContainer
      ? createPortal(
          <div
            ref={cardRef}
            style={userCard.style}
            // Prevent map clicks inside the card from bubbling to the backdrop listener
            onMouseDown={(e) => e.stopPropagation()}
          >
            <AttendeeStyleProfileCard
              displayName={userCard.user.twitter_name}
              avatarUrl={userCard.user.avatar_url}
              isVerified={userCard.user.is_verified}
              roleLabel={
                userCard.user.role
                  ? USER_ROLE_LABELS[userCard.user.role] || userCard.user.role
                  : "Role not specified"
              }
              locationLine={
                [userCard.user.city, userCard.user.country].filter(Boolean).join(", ") ||
                "Location unknown"
              }
              aboutText={
                userCard.user.about || userCard.user.bio || "Profile has no about yet."
              }
              strokeVariant="top"
              onView={
                () => {
                  window.location.href = `/profile/${userCard.user.id}`;
                }
              }
              viewDisabled={false}
            />
          </div>,
          mapContainer
        )
      : null;

  return (
    <>
      {visibleMarkers.map((marker) => {
        const isUser = isUserMarker(marker);
        const isEvent = marker.type === "event";
        // Authenticated user markers: use custom overlay, no MapLibre popup.
        // Unauthenticated user markers: keep small sign-in MapLibre popup.
        // Event markers: always use custom overlay for smart positioning.
        // All other markers: keep MapLibre popup.
        // For this map we suppress MapLibre popups for users/events and use:
        // - custom overlays when authenticated
        // - a single compact auth modal when unauthenticated
        const useCustomOverlay = true;

        return (
          <MapMarkerComponent
            key={marker.id}
            longitude={marker.longitude}
            latitude={marker.latitude}
            onClick={() => {
              handleMarkerClick(marker);
              if (!isAuthenticated) {
                const redirectTo =
                  typeof window !== "undefined"
                    ? `${window.location.pathname}${window.location.search}`
                    : undefined;
                setAuthRedirectTo(redirectTo);
                if (isUser) {
                  setAuthModalTitle("Log in or Sign up to view profiles");
                } else if (isEvent) {
                  setAuthModalTitle("Log in or Sign up to view event details");
                } else {
                  setAuthModalTitle("Log in or Sign up to continue");
                }
                setShowAuthModal(true);
                return;
              }

              if (isUser) {
                openUserCard(marker);
              } else if (isEvent) {
                openEventCard(marker);
              }
            }}
            anchor="bottom"
          >
            <MarkerContent>
              <MarkerIcon
                type={marker.type}
                user={isUser ? (marker.data as User) : undefined}
                event={isEvent ? (marker.data as Event) : undefined}
              />
            </MarkerContent>
            {!useCustomOverlay ? (
              <MarkerPopup closeButton={false} maxWidth="350px" className="solpoint-popup-maplibre">
                {renderPopupContent(marker)}
              </MarkerPopup>
            ) : null}
          </MapMarkerComponent>
        );
      })}
      {eventCardPortal}
      {userCardPortal}
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        variant="compact"
        title={authModalTitle}
        redirectTo={authRedirectTo}
      />
      {/* Custom styles for popups and animations */}
      <style jsx global>{`
        /* Remove default Tailwind styles from MarkerPopup */
        .solpoint-popup-maplibre {
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        
        /* Remove border from wrapper - cards have their own borders */
        .maplibregl-popup-content {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          min-width: 280px !important;
          max-width: 350px !important;
          /* Prevent popup from overflowing the map container vertically */
          max-height: calc(100vh - 120px) !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        
        /* Hide close button */
        .maplibregl-popup-close-button {
          display: none !important;
        }
        
        /* Popup tip styling */
        .maplibregl-popup-tip {
          display: none !important;
        }
        
        /* Cluster pulse animation - пульсирующее кольцо */
        @keyframes cluster-pulse {
          0%, 100% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.2;
            transform: translate(-50%, -50%) scale(1.3);
          }
        }
        
        /* Появление маркеров и кластеров */
        @keyframes cluster-appear {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(20px);
          }
          60% {
            transform: scale(1.05) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        /* Hover эффект со свечением */
        @keyframes marker-glow {
          0%, 100% {
            filter: drop-shadow(0 4px 8px rgba(20, 241, 149, 0.3));
          }
          50% {
            filter: drop-shadow(0 6px 12px rgba(20, 241, 149, 0.6));
          }
        }
      `}</style>
    </>
  );
}
