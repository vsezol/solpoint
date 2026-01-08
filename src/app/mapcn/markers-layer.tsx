"use client";

import { useEffect, useState, useCallback } from "react";
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
        .map((marker) => {
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
                closeButton={true}
                maxWidth="350px"
                className="solpoint-popup-maplibre"
              >
                {renderPopupContent(marker)}
              </MarkerPopup>
            </MapMarkerComponent>
          );
        })}
      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description="Viewing user profiles is available only with PRO subscription. Upgrade to PRO to unlock this feature."
      />
      {/* Custom styles for popups - EXACT match to Leaflet popup style */}
 
    </>
  );
}

