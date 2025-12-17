"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, Marker, Popup, useMap, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker, User, Event, Hub } from "@/types";
import type { GeoJsonObject } from "geojson";
import { UserCard } from "@/components/cards/user-card";
import { EventCard } from "@/components/cards/event-card";
import { HubCard } from "@/components/cards/hub-card";

// Fix for default markers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => void })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons for users
const createCustomIcon = (type: MapMarker["type"]) => {
  const colors = {
    user: "#ef4444",      // Red
    vip_user: "#fbbf24",  // Yellow/Gold
    hub: "#3b82f6",       // Blue (not used, hub has separate icon)
    event: "#14f195",     // Green (not used, event has separate icon)
  };

  // Red circular marker for regular users
  if (type === "user") {
    const svgMarker = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
        <circle cx="16" cy="16" r="10" fill="#ffffff" opacity="0.9"/>
      </svg>
    `;
    return L.divIcon({
      html: svgMarker,
      className: "custom-marker user-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }

  // Yellow circular marker for VIP users
  if (type === "vip_user") {
    const svgMarker = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#fbbf24" stroke="#ffffff" stroke-width="2"/>
        <circle cx="16" cy="16" r="10" fill="#ffffff" opacity="0.9"/>
      </svg>
    `;
    return L.divIcon({
      html: svgMarker,
      className: "custom-marker vip-user-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }

  // Fallback
  const svgMarker = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${colors[type]}" stroke="#ffffff" stroke-width="2"/>
    </svg>
  `;
  return L.divIcon({
    html: svgMarker,
    className: "custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// Hub marker using community-hubs.svg
const createHubIcon = () => {
  return L.divIcon({
    html: `<img src="/community-hubs.svg" alt="Hub" style="width: 46px; height: 54px;" />`,
    className: "custom-marker hub-marker",
    iconSize: [46, 54],
    iconAnchor: [23, 54],
    popupAnchor: [0, -50],
  });
};

// Event marker using event-icon.svg
const createEventIcon = () => {
  return L.divIcon({
    html: `<img src="/event-icon.svg" alt="Event" style="width: 46px; height: 54px;" />`,
    className: "custom-marker event-marker",
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
    if (center && zoom) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);

  return null;
}

interface SolPointMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (marker: MapMarker) => void;
  isVip?: boolean;
  isAuthenticated?: boolean;
}

export function SolPointMap({
  markers,
  center = [35, 50],
  zoom = 3,
  onMarkerClick,
  isVip = false,
  isAuthenticated = false,
}: SolPointMapProps) {
  const [, setSelectedMarker] = useState<MapMarker | null>(null);
  const [worldGeoJson, setWorldGeoJson] = useState<GeoJsonObject | null>(null);

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

  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      setSelectedMarker(marker);
      onMarkerClick?.(marker);
    },
    [onMarkerClick]
  );

  const getIcon = (marker: MapMarker) => {
    switch (marker.type) {
      case "hub":
        return createHubIcon();
      case "event":
        return createEventIcon();
      default:
        return createCustomIcon(marker.type);
    }
  };

  const renderPopupContent = (marker: MapMarker) => {
    switch (marker.type) {
      case "user":
      case "vip_user":
        return <UserCard user={marker.data as User} isVip={isVip} compact />;
      case "event":
        return <EventCard event={marker.data as Event} isVip={isVip} isAuthenticated={isAuthenticated} compact />;
      case "hub":
        return <HubCard hub={marker.data as Hub} compact />;
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
            style={() => ({
              fillColor: "#452D9F", // Фиолетовый для материков
              fillOpacity: 1,
              color: "#A4E3B4", // Светло-зеленый для границ стран
              weight: 1.5,
              opacity: 1,
            })}
            eventHandlers={{
              mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                  fillOpacity: 0.95,
                  weight: 2,
                });
              },
              mouseout: (e) => {
                const layer = e.target;
                layer.setStyle({
                  fillOpacity: 1,
                  weight: 1.5,
                });
              },
            }}
          />
        )}
        <MapController center={center} zoom={zoom} />

        {markers.map((marker) => (
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
        
        .vip-user-marker {
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
    </div>
  );
}

