"use client";

import { useEffect, useState } from "react";
import type { GeoJSON } from "geojson";
import MapLibreGL from "maplibre-gl";
import { useMap } from "@/components/ui/map";

interface CitiesLayerProps {
  /** URL to fetch GeoJSON data from */
  dataUrl?: string;
  /** Minimum zoom level to show cities (default: 6) */
  minZoom?: number;
}

/**
 * Component that renders cities GeoJSON layer with black borders
 * matching the main SolPoint map style
 */
export function CitiesLayer({ dataUrl = "/cities.json", minZoom = 6 }: CitiesLayerProps) {
  const { map, isLoaded } = useMap();
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [currentZoom, setCurrentZoom] = useState(4);
  const [isLoadedOnce, setIsLoadedOnce] = useState(false);

  const sourceId = "cities-source";
  const borderLayerId = "cities-border";

  // Track zoom level
  useEffect(() => {
    if (!isLoaded || !map) return;

    const updateZoom = () => {
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);
    };

    updateZoom();
    map.on("zoom", updateZoom);
    map.on("zoomend", updateZoom);

    return () => {
      map.off("zoom", updateZoom);
      map.off("zoomend", updateZoom);
    };
  }, [isLoaded, map, minZoom]);

  // Load GeoJSON data for cities (only once when zoom >= minZoom)
  useEffect(() => {
    if (!isLoaded || !map) return;
    if (isLoadedOnce) return; // Load only once
    if (currentZoom < minZoom) return;

    fetch(dataUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load cities GeoJSON");
        return response.json();
      })
      .then((data: GeoJSON.FeatureCollection) => {
        // Filter out features with null geometry
        if (data.features) {
          data.features = data.features.filter(
            (feature: any) => feature.geometry !== null
          );
        }
        setGeoJson(data);
        setIsLoadedOnce(true);
      })
      .catch((error) => {
        console.error("Error loading cities GeoJSON:", error);
      });
  }, [isLoaded, map, currentZoom, minZoom, dataUrl, isLoadedOnce]);

  // Add GeoJSON source and layer
  useEffect(() => {
    if (!isLoaded || !map || !geoJson) return;
    if (currentZoom < minZoom) {
      // Hide layer if zoom < minZoom
      if (map.getLayer(borderLayerId)) {
        map.setLayoutProperty(borderLayerId, "visibility", "none");
      }
      return;
    }

    // Add source
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: geoJson,
      });
    } else {
      const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
      source.setData(geoJson);
    }

    // Add border layer for cities
    if (!map.getLayer(borderLayerId)) {
      map.addLayer({
        id: borderLayerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#000000", // Black borders
          "line-width": 0.8, // Thin lines
          "line-opacity": 0.7, // Slightly transparent
        },
      });
    } else {
      // Show layer if it was hidden
      map.setLayoutProperty(borderLayerId, "visibility", "visible");
    }

    // Cleanup
    return () => {
      try {
        if (map.getLayer(borderLayerId)) {
          map.setLayoutProperty(borderLayerId, "visibility", "none");
        }
        // Don't remove source and layer on cleanup - only hide them
      } catch {
        // Ignore errors during cleanup
      }
    };
  }, [isLoaded, map, geoJson, currentZoom, minZoom, sourceId, borderLayerId]);

  return null;
}

