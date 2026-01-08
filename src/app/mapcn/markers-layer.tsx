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

// Функция кластеризации маркеров
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
  
  const clusters: Cluster[] = [];
  const processed = new Set<string>();
  
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
  
  validMarkers.forEach((marker, index) => {
    if (processed.has(marker.id)) return;
    
    // Ищем близкие маркеры для кластеризации
    const nearbyMarkers: MapMarker[] = [marker];
    const clusterLatitudes: number[] = [marker.latitude];
    const clusterLongitudes: number[] = [marker.longitude];
    
    for (let i = index + 1; i < validMarkers.length; i++) {
      const otherMarker = validMarkers[i];
      if (processed.has(otherMarker.id)) continue;
      
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
        id: `cluster-${marker.id}`,
        latitude: avgLat,
        longitude: avgLng,
        markers: nearbyMarkers,
        count: nearbyMarkers.length,
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
  
  validMarkers.forEach((marker) => {
    if (!clusteredMarkerIds.has(marker.id)) {
      result.push(marker);
    }
  });
  
  return result;
}

// Компонент для отображения иконки маркера
const MarkerIcon = ({ type }: { type: MapMarker["type"] }) => {
  let imgSrc = "";
  let filterStyle = "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))";

  switch (type) {
    case "user":
      imgSrc = "/free-user-pin.svg";
      filterStyle = "drop-shadow(0 2px 4px rgba(239, 68, 68, 0.4))";
      break;
    case "pro_user":
      imgSrc = "/pro-user-pin.svg";
      filterStyle = "drop-shadow(0 2px 4px rgba(251, 191, 36, 0.4))";
      break;
    case "event":
      imgSrc = "/event-icon.svg";
      break;
    case "hub":
    case "workspace":
    case "community":
      imgSrc = "/community-hubs.svg";
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
const ClusterIcon = ({ count }: { count: number }) => {
  // Определяем размер кластера в зависимости от количества маркеров
  const size = count < 10 ? 50 : count < 100 ? 60 : 70;
  const fontSize = count < 10 ? 14 : count < 100 ? 16 : 18;
  
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        backgroundColor: "#3b82f6",
        border: "3px solid white",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "bold",
        fontSize: `${fontSize}px`,
        transition: "transform 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {count}
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
                <ClusterIcon count={cluster.count} />
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
                <MarkerIcon type={marker.type} />
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
      {/* Custom styles for popups */}
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
        }
        
        /* Hide close button */
        .maplibregl-popup-close-button {
          display: none !important;
        }
        
        /* Popup tip styling */
        .maplibregl-popup-tip {
          display: none !important;
        }
      `}</style>
    </>
  );
}

