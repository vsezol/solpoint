"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker, User, Event, Hub } from "@/types";
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

// Custom marker icons
const createCustomIcon = (type: MapMarker["type"]) => {
  const colors = {
    user: "#ef4444",      // Red
    vip_user: "#fbbf24",  // Yellow/Gold
    hub: "#3b82f6",       // Blue
    event: "#14f195",     // Green
  };

  const svgMarker = `
    <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 0C8.954 0 0 8.954 0 20c0 15 20 30 20 30s20-15 20-30C40 8.954 31.046 0 20 0z" fill="${colors[type]}"/>
      <circle cx="20" cy="18" r="12" fill="white" opacity="0.9"/>
      <circle cx="20" cy="18" r="10" fill="${colors[type]}" opacity="0.3"/>
    </svg>
  `;

  return L.divIcon({
    html: svgMarker,
    className: "custom-marker",
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -45],
  });
};

// Hub marker (square shape like in design)
const createHubIcon = () => {
  const svg = `
    <svg width="48" height="56" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="44" height="44" rx="8" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
      <path d="M24 50L18 44H30L24 50Z" fill="#3b82f6"/>
      <circle cx="24" cy="24" r="14" fill="white" opacity="0.9"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "custom-marker hub-marker",
    iconSize: [48, 56],
    iconAnchor: [24, 56],
    popupAnchor: [0, -50],
  });
};

// Event marker (rounded square with point)
const createEventIcon = () => {
  const svg = `
    <svg width="48" height="56" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#14f195" stroke="#ffffff" stroke-width="2"/>
      <path d="M24 50L18 44H30L24 50Z" fill="#14f195"/>
      <circle cx="24" cy="24" r="14" fill="white" opacity="0.9"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "custom-marker event-marker",
    iconSize: [48, 56],
    iconAnchor: [24, 56],
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
}

export function SolPointMap({
  markers,
  center = [35, 50],
  zoom = 3,
  onMarkerClick,
  isVip = false,
}: SolPointMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

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
        return <EventCard event={marker.data as Event} isVip={isVip} compact />;
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
        className="w-full h-full rounded-xl overflow-hidden"
        style={{ background: "var(--color-surface)" }}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
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

      {/* Custom styles for markers */}
      <style jsx global>{`
        .custom-marker {
          background: transparent;
          border: none;
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
      `}</style>
    </div>
  );
}

