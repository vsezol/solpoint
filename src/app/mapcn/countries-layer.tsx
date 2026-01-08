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
 * - Countries: #452D9F (purple) with 90% opacity
 * - Borders: #A4E3B4 (light green) at zoom < 5, #8B7EC8 (darker purple) at zoom >= 5
 */
export function CountriesLayer({ dataUrl = "/world.geo.json", geoJsonData }: CountriesLayerProps) {
  const { map, isLoaded } = useMap();
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(
    geoJsonData || null
  );
  const [currentZoom, setCurrentZoom] = useState(4);

  const sourceId = "countries-source";
  const fillLayerId = "countries-fill";
  const borderLayerId = "countries-border";

  // Load GeoJSON data
  useEffect(() => {
    if (geoJsonData) {
      setGeoJson(geoJsonData);
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

  // Track zoom level
  useEffect(() => {
    if (!isLoaded || !map) return;

    const updateZoomEnd = () => {
      const newZoom = map.getZoom();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'countries-layer.tsx:60',message:'Zoom ended - updating state',data:{oldZoom:currentZoom,newZoom},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      setCurrentZoom(newZoom);
    };

    setCurrentZoom(map.getZoom());
    map.on("zoomend", updateZoomEnd);

    return () => {
      map.off("zoomend", updateZoomEnd);
    };
  }, [isLoaded, map]);

  // Add GeoJSON source and layers
  useEffect(() => {
    if (!isLoaded || !map || !geoJson) return;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'countries-layer.tsx:72',message:'Effect triggered',data:{isLoaded,hasMap:!!map,hasGeoJson:!!geoJson,currentZoom,geoJsonFeatures:geoJson?.features?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,D'})}).catch(()=>{});
    // #endregion

    // Add source
    if (!map.getSource(sourceId)) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'countries-layer.tsx:76',message:'Adding new source',data:{sourceId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,D'})}).catch(()=>{});
      // #endregion
      map.addSource(sourceId, {
        type: "geojson",
        data: geoJson,
      });
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'countries-layer.tsx:82',message:'Updating existing source',data:{sourceId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,D'})}).catch(()=>{});
      // #endregion
      const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
      source.setData(geoJson);
    }

    // Add fill layer for countries
    if (!map.getLayer(fillLayerId)) {
      map.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": "#452D9F", // Purple for continents
          "fill-opacity": 0.9,
        },
      });
    }

    // Add border layer with dynamic color based on zoom
    if (!map.getLayer(borderLayerId)) {
      map.addLayer({
        id: borderLayerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": currentZoom >= 5 ? "#8B7EC8" : "#A4E3B4", // Darker purple at zoom >= 5, light green at zoom < 5
          "line-width": currentZoom < 5 ? 1.5 : currentZoom < 7 ? 1.2 : 1,
          "line-opacity": 1,
        },
      });
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
        0.85,
        0.9,
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

