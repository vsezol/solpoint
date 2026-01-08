"use client";

import { useEffect, useState } from "react";
import type { GeoJSON } from "geojson";
import MapLibreGL from "maplibre-gl";
import { useMap } from "@/components/ui/map";

interface CountriesLayerProps {
  /** URL to fetch GeoJSON data from */
  dataUrl?: string;
  /** GeoJSON data (if provided, dataUrl is ignored) */
  geoJsonData?: GeoJSON.FeatureCollection;
}

/**
 * Component that renders countries GeoJSON layer with custom styling
 * matching the main SolPoint map colors:
 * - Water: #18E3C5 (cyan)
 * - Countries: #8B5CF6 (purple) with 90% opacity
 * - Borders: #A4E3B4 (light green) at zoom < 5, #8B7EC8 (darker purple) at zoom >= 5
 */
export function CountriesLayer({ dataUrl = "/world.geo.json", geoJsonData }: CountriesLayerProps) {
  const { map, isLoaded } = useMap();
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(
    geoJsonData || null
  );

  const sourceId = "countries-source";
  const fillLayerId = "countries-fill";
  const borderLayerId = "countries-border";

  // Load GeoJSON data
  useEffect(() => {
    if (geoJsonData) {
      // Use a timeout to avoid synchronous setState in effect
      setTimeout(() => setGeoJson(geoJsonData), 0);
      return;
    }

    fetch(dataUrl)
      .then((response) => response.json())
      .then((data: GeoJSON.FeatureCollection) => {
        setGeoJson(data);
      })
      .catch((error) => {
        console.error("Error loading countries GeoJSON:", error);
      });
  }, [dataUrl, geoJsonData]);

  // Add GeoJSON source and layers
  useEffect(() => {
    if (!isLoaded || !map || !geoJson) return;

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

    // Add fill layer for countries - insert BEFORE label layers so text appears above
    // Use lower opacity to let base map details (borders, etc.) show through
    if (!map.getLayer(fillLayerId)) {
      // Find first label layer in the style to insert our layer before it
      // This ensures text labels appear above our purple fill layer
      const style = map.getStyle();
      const layers = style.layers || [];
      const firstLabelLayer = layers.find((layer): layer is MapLibreGL.LayerSpecification => {
        if (typeof layer === "string") return false;
        const layerId = layer.id;
        const layerType = layer.type;
        // Label layers in CARTO basemaps typically have "label" in their name or are symbol layers
        return (
          layerType === "symbol" ||
          layerId.toLowerCase().includes("label") ||
          layerId.toLowerCase().includes("place")
        );
      });
      const beforeId = firstLabelLayer?.id;

      map.addLayer(
        {
          id: fillLayerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#8B5CF6", // Purple for continents
            "fill-opacity": 0.5, // Lower opacity so borders and labels show through clearly
          },
        },
        beforeId // Insert before label layers so text appears above
      );
    }

    // Add border layer with dynamic color based on zoom
    // This layer should also be before labels to preserve base map border visibility
    if (!map.getLayer(borderLayerId)) {
      const style = map.getStyle();
      const layers = style.layers || [];
      const firstLabelLayer = layers.find((layer): layer is MapLibreGL.LayerSpecification => {
        if (typeof layer === "string") return false;
        const layerId = layer.id;
        const layerType = layer.type;
        return (
          layerType === "symbol" ||
          layerId.toLowerCase().includes("label") ||
          layerId.toLowerCase().includes("place")
        );
      });
      const beforeId = firstLabelLayer?.id || fillLayerId; // Fallback to after fill layer if no labels found

      map.addLayer(
        {
          id: borderLayerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": [
              "case",
              [">=", ["zoom"], 5],
              "#8B7EC8",
              "#A4E3B4",
            ],
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0, 1.5,
              5, 1.5,
              7, 1.2,
              10, 1,
            ],
            "line-opacity": 0.9, // Higher opacity for borders to be clearly visible
          },
        },
        beforeId // Insert before label layers
      );
    }

    // Update border properties with expressions that depend on zoom
    // This avoids needing to update paint properties on every zoom change
    if (map.getLayer(borderLayerId)) {
      map.setPaintProperty(borderLayerId, "line-color", [
        "case",
        [">=", ["zoom"], 5],
        "#8B7EC8",
        "#A4E3B4",
      ]);
      map.setPaintProperty(borderLayerId, "line-width", [
        "interpolate",
        ["linear"],
        ["zoom"],
        0, 1.5,
        5, 1.5,
        7, 1.2,
        10, 1,
      ]);
    }

    // Add hover effect for individual countries
    const handleMouseEnter = (e: MapLibreGL.MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0) {
        map.setFeatureState(
          { source: sourceId, id: e.features[0].id || 0 },
          { hover: true }
        );
      }
    };

    const handleMouseLeave = (e: MapLibreGL.MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0) {
        map.setFeatureState(
          { source: sourceId, id: e.features[0].id || 0 },
          { hover: false }
        );
      }
    };

    // Update fill layer to use feature state for hover
    if (map.getLayer(fillLayerId)) {
      map.setPaintProperty(fillLayerId, "fill-opacity", [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        0.7, // Slightly more visible on hover
        0.5, // Base opacity - low to preserve visibility of borders and labels
      ]);
    }

    // Update border layer to use feature state for hover with zoom expressions
    if (map.getLayer(borderLayerId)) {
      map.setPaintProperty(borderLayerId, "line-color", [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        "#C4B5FD",
        [">=", ["zoom"], 5],
        "#8B7EC8",
        "#A4E3B4",
      ]);
      map.setPaintProperty(borderLayerId, "line-width", [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        [
          "case",
          [">=", ["zoom"], 5],
          1.5,
          2,
        ],
        [
          "interpolate",
          ["linear"],
          ["zoom"],
          0, 1.5,
          5, 1.5,
          7, 1.2,
          10, 1,
        ],
      ]);
    }

    // Change cursor to pointer on hover
    map.on("mouseenter", fillLayerId, (e) => {
      map.getCanvas().style.cursor = "pointer";
      handleMouseEnter(e);
    });

    map.on("mouseleave", fillLayerId, (e) => {
      map.getCanvas().style.cursor = "";
      handleMouseLeave(e);
    });

    // Cleanup
    return () => {
      try {
        map.off("mouseenter", fillLayerId, handleMouseEnter);
        map.off("mouseleave", fillLayerId, handleMouseLeave);
        if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // Ignore errors during cleanup
      }
    };
  }, [isLoaded, map, geoJson, fillLayerId, borderLayerId, sourceId]);

  return null;
}

