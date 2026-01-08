"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useMap, MapMarker as MapMarkerComponent, MarkerContent, MarkerPopup } from "@/components/ui/map";
import type { MapMarker, User, Event, Hub, Community, Workspace } from "@/types";
import { UserCard } from "@/components/cards/user-card";
import { EventCard } from "@/components/cards/event-card";
import { HubCard } from "@/components/cards/hub-card";
import { ProSubscriptionModal } from "@/components/ui";
import { trackEvent } from "@/lib/analytics";

interface MapMarkersLayerProps {
  markers: MapMarker[];
  isVip?: boolean;
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
const MarkerIcon = ({ type, user }: { type: MapMarker["type"]; user?: User }) => {
  let imgSrc = "";
  let filterStyle = "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))";

  // For user markers, create SVG with avatar
  if (type === "user" || type === "pro_user") {
    const avatarUrl = user?.avatar_url || "";
    const clipId = user?.id ? `avatar-clip-${user.id.replace(/[^a-zA-Z0-9]/g, '-')}` : 'avatar-clip-default';
    const escapedAvatarUrl = avatarUrl ? avatarUrl.replace(/"/g, '&quot;') : '';
    
    filterStyle = "drop-shadow(0 4px 8px rgba(20, 241, 149, 0.4))";
    
    const svg = `
      <svg width="46" height="54" viewBox="0 0 27 42" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <path d="M13.5 1C20.4036 1 26 6.59644 26 13.5C26 16.3142 25.0694 18.9108 23.5 21C21 24.5 14.5 29 14.5 38C14.5 38.5523 14.0523 39 13.5 39C12.9477 39 12.5 38.5523 12.5 38C12.5 29 6 24.5 3.5 21C1.93058 18.9108 1 16.3142 1 13.5C1 6.59644 6.59644 1 13.5 1Z" fill="#111820" stroke="#14f195" stroke-width="1.5"/>
        <circle cx="13.5" cy="13.5" r="11" fill="none" stroke="#14f195" stroke-width="1.5"/>
        ${avatarUrl ? `
          <defs>
            <clipPath id="${clipId}">
              <circle cx="13.5" cy="13.5" r="10.6"/>
            </clipPath>
          </defs>
          <image xlink:href="${escapedAvatarUrl}" x="2.9" y="2.9" width="21.2" height="21.2" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>
        ` : `
          <circle cx="13.5" cy="13.5" r="10.6" fill="#14f195" fill-opacity="0.3"/>
        `}
      </svg>
    `;

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
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  // For other marker types, use existing images
  switch (type) {
    case "event":
      imgSrc = "/event-pin.svg";
      filterStyle = "drop-shadow(0 4px 8px rgba(20, 241, 149, 0.4))";
      break;
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

export function MapMarkersLayer({
  markers,
  isVip = false,
  isAuthenticated = false,
  currentUserId,
}: MapMarkersLayerProps) {
  const { map, isLoaded } = useMap();
  const [friendshipStatuses, setFriendshipStatuses] = useState<
    Record<string, "none" | "following" | "mutual">
  >({});
  const [showProModal, setShowProModal] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(4);

  // Отслеживаем зум карты для кластеризации
  useEffect(() => {
    if (!map || !isLoaded) return;

    const updateZoom = () => {
      setCurrentZoom(map.getZoom());
    };

    updateZoom();
    map.on("zoom", updateZoom);
    map.on("moveend", updateZoom);

    return () => {
      map.off("zoom", updateZoom);
      map.off("moveend", updateZoom);
    };
  }, [map, isLoaded]);

  // Кластеризуем маркеры на основе текущего зума
  const clusteredItems = useMemo(() => {
    return clusterMarkers(markers, currentZoom);
  }, [markers, currentZoom]);

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

  const handleAddFriend = useCallback(
    async (userId: string) => {
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
    },
    [isAuthenticated, currentUserId]
  );

  const handleRemoveFriend = useCallback(
    async (userId: string) => {
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
    },
    [isAuthenticated, currentUserId]
  );

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

  const handleClusterClick = useCallback(
    (cluster: Cluster) => {
      if (!map) return;

      trackEvent("map_cluster_click", {
        event_category: "Map",
        cluster_id: cluster.id,
        marker_count: cluster.count,
      });

      // Вычисляем bounding box для всех маркеров в кластере
      const lats = cluster.markers.map((m) => m.latitude);
      const lngs = cluster.markers.map((m) => m.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // Вычисляем центр и зум для кластера
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      // Вычисляем оптимальный зум на основе размера кластера
      const latRange = maxLat - minLat;
      const lngRange = maxLng - minLng;
      const maxRange = Math.max(latRange, lngRange);

      let targetZoom = currentZoom + 2;
      if (maxRange > 0.5) targetZoom = currentZoom + 1;
      if (maxRange > 1) targetZoom = currentZoom + 0.5;
      if (maxRange > 2) targetZoom = currentZoom;

      // Ограничиваем зум
      targetZoom = Math.min(Math.max(targetZoom, currentZoom + 1), 16);

      // Плавно зумим к кластеру
      map.flyTo({
        center: [centerLng, centerLat],
        zoom: targetZoom,
        duration: 500,
      });
    },
    [map, currentZoom]
  );

  const renderPopupContent = (marker: MapMarker) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'markers-layer.tsx:renderPopupContent',message:'Rendering popup content',data:{markerType:marker.type,markerId:marker.id},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
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
        let cardFriendshipStatus:
          | "none"
          | "pending_sent"
          | "pending_received"
          | "accepted"
          | "blocked" = "none";
        if (friendshipStatus === "mutual") {
          cardFriendshipStatus = "accepted";
        } else if (friendshipStatus === "following") {
          cardFriendshipStatus = "pending_sent";
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'markers-layer.tsx:renderPopupContent:user',message:'Rendering UserCard',data:{markerType:'user',hasBorder:false,hasBackground:false},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        return (
          <UserCard
            user={user}
            isVip={user.subscription_tier === "vip"}
            compact
            isFriend={isFriend}
            friendshipStatus={cardFriendshipStatus}
            onAddFriend={
              friendshipStatus === "none" ? () => handleAddFriend(user.id) : undefined
            }
            onRemoveFriend={
              friendshipStatus === "following" || friendshipStatus === "mutual"
                ? () => handleRemoveFriend(user.id)
                : undefined
            }
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'markers-layer.tsx:renderPopupContent:event',message:'Rendering EventCard',data:{markerType:'event',hasBorder:true,hasBackground:false},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return (
          <EventCard
            event={marker.data as Event}
            isVip={isVip}
            isAuthenticated={isAuthenticated}
            compact
            isBlurred={!isAuthenticated}
          />
        );
      case "hub":
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'markers-layer.tsx:renderPopupContent:hub',message:'Rendering HubCard',data:{markerType:'hub',hasBorder:false,hasBackground:false},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return (
          <HubCard
            hub={marker.data as Hub}
            compact
            entityType="hub"
            isBlurred={!isAuthenticated}
          />
        );
      case "workspace":
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'markers-layer.tsx:renderPopupContent:workspace',message:'Rendering Workspace HubCard',data:{markerType:'workspace',hasBorder:false,hasBackground:false},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return (
          <HubCard
            hub={marker.data as Workspace}
            compact
            entityType="workspace"
            isBlurred={!isAuthenticated}
          />
        );
      case "community":
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'markers-layer.tsx:renderPopupContent:community',message:'Rendering Community HubCard',data:{markerType:'community',hasBorder:false,hasBackground:false},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
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

  return (
    <>
      {clusteredItems.map((item) => {
        // Проверяем, является ли элемент кластером
        // Используем type guard для более точной проверки
        const isCluster = 
          typeof item === "object" &&
          item !== null &&
          "count" in item &&
          "markers" in item &&
          Array.isArray((item as Cluster).markers);
        
        if (isCluster) {
          const cluster = item as Cluster;
          return (
            <MapMarkerComponent
              key={cluster.id}
              longitude={cluster.longitude}
              latitude={cluster.latitude}
              onClick={() => handleClusterClick(cluster)}
              anchor="center"
            >
              <MarkerContent>
                <ClusterIcon count={cluster.count} type={cluster.type} />
              </MarkerContent>
            </MapMarkerComponent>
          );
        } else {
          // Обычный маркер
          const marker = item as MapMarker;
          return (
            <MapMarkerComponent
              key={marker.id}
              longitude={marker.longitude}
              latitude={marker.latitude}
              onClick={() => handleMarkerClick(marker)}
              anchor="bottom"
            >
              <MarkerContent>
                <MarkerIcon 
                  type={marker.type} 
                  user={(marker.type === "user" || marker.type === "pro_user") ? (marker.data as User) : undefined}
                />
              </MarkerContent>
              <MarkerPopup
                closeButton={false}
                maxWidth="350px"
                className="solpoint-popup-maplibre"
              >
                {renderPopupContent(marker)}
              </MarkerPopup>
            </MapMarkerComponent>
          );
        }
      })}
      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description="Viewing user profiles is available only with PRO subscription. Upgrade to PRO to unlock this feature."
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

