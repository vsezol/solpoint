"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

// Fix for default markers (только в браузере)
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => void })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

// Custom marker icon for location picker (только в браузере)
const createLocationIcon = () => {
  if (typeof window === "undefined") {
    return undefined;
  }
  const svgMarker = `
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 40 16 40C16 40 32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="#14f195" stroke="#ffffff" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="#ffffff"/>
    </svg>
  `;
  return L.divIcon({
    html: svgMarker,
    className: "location-picker-marker",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  });
};

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  onReverseGeocode?: (result: {
    country: string;
    country_code?: string;
    city?: string;
    full_address: string;
  }) => void;
  className?: string;
  height?: string;
  centerLat?: number;
  centerLng?: number;
  centerZoom?: number;
}

// Component to handle map clicks
function MapClickHandler({ 
  onLocationChange,
  onReverseGeocode 
}: { 
  onLocationChange: (lat: number, lng: number) => void;
  onReverseGeocode?: (result: {
    country: string;
    country_code?: string;
    city?: string;
    full_address: string;
  }) => void;
}) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      onLocationChange(lat, lng);
      
      // Perform reverse geocoding if callback provided
      if (onReverseGeocode) {
        try {
          const { reverseGeocode } = await import("@/lib/api/geocoding");
          const result = await reverseGeocode(lat, lng);
          if (result) {
            onReverseGeocode({
              country: result.country,
              country_code: result.country_code,
              city: result.city || undefined,
              full_address: result.full_address,
            });
          }
        } catch (error) {
          console.error("Error performing reverse geocoding:", error);
        }
      }
    },
  });
  return null;
}

// Component to update map center when props change and store map reference
function SetViewOnChange({ 
  center, 
  zoom, 
  onMapReady 
}: { 
  center: [number, number] | undefined; 
  zoom: number;
  onMapReady?: (map: L.Map) => void;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  onReverseGeocode,
  className,
  height = "400px",
  centerLat,
  centerLng,
  centerZoom = 13,
}: LocationPickerProps) {
  const [isClient, setIsClient] = useState(false);
  const [position, setPosition] = useState<[number, number]>([latitude || 0, longitude || 0]);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update marker position when coordinates change
  useEffect(() => {
    if (latitude && longitude) {
      const newPosition: [number, number] = [latitude, longitude];
      // Only update if position actually changed (more than 0.0001 degrees difference)
      const latDiff = Math.abs(position[0] - latitude);
      const lngDiff = Math.abs(position[1] - longitude);
      
      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        setPosition(newPosition);
      }
    } else if ((!latitude || !longitude) && (position[0] !== 0 || position[1] !== 0)) {
      // Reset to default if coordinates are cleared
      setPosition([0, 0]);
    }
  }, [latitude, longitude]);

  // Prepare center coordinates for SetViewOnChange component
  const mapCenter: [number, number] | undefined = 
    centerLat !== undefined && centerLng !== undefined 
      ? [centerLat, centerLng] 
      : undefined;

  const handleLocationChange = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationChange(lat, lng);
  };

  if (!isClient) {
    return (
      <div 
        className={cn("flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg", className)}
        style={{ height }}
      >
        <div className="text-[var(--color-text-muted)]">Loading map...</div>
      </div>
    );
  }

  // Default to center of world if no coordinates provided
  const hasValidCoords = latitude && longitude && latitude !== 0 && longitude !== 0;
  const initialPosition: [number, number] = hasValidCoords ? [latitude, longitude] : [20, 0];
  const initialZoom = hasValidCoords ? 13 : 2;

  return (
    <div className={cn("rounded-lg overflow-hidden border border-[var(--color-surface-border)]", className)} style={{ height }}>
      <MapContainer
        center={initialPosition}
        zoom={initialZoom}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SetViewOnChange 
          center={mapCenter} 
          zoom={centerZoom}
          onMapReady={(map) => {
            mapRef.current = map;
          }}
        />
        <MapClickHandler 
          onLocationChange={handleLocationChange}
          onReverseGeocode={onReverseGeocode}
        />
        {(position[0] !== 0 || position[1] !== 0) && (
          <Marker position={position} icon={createLocationIcon()} />
        )}
      </MapContainer>
    </div>
  );
}

