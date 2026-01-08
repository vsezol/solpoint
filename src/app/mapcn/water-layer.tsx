"use client";

import { useEffect } from "react";
import { useMap } from "@/components/ui/map";

/**
 * Component that adds a cyan water background layer
 * to override the base map water color
 */
export function WaterLayer() {
  const { map, isLoaded } = useMap();

  const backgroundLayerId = "water-background";

  useEffect(() => {
    if (!isLoaded || !map) return;

    // Wait for style to be fully loaded
    const updateWaterColor = () => {
      // Try to override water layer colors in the base map
      // CARTO basemaps typically have layers named like "water", "waterway", "ocean", etc.
      const style = map.getStyle();
      const allLayers = style.layers || [];

      // Find all water-related layers
      allLayers.forEach((layer) => {
        const layerId = typeof layer === "string" ? layer : layer.id;
        const layerType = typeof layer === "string" ? undefined : layer.type;
        
        // Check if this is a water layer (by name or type)
        if (
          typeof layer !== "string" &&
          (layer.id.toLowerCase().includes("water") ||
            layer.id.toLowerCase().includes("ocean") ||
            layer.id.toLowerCase().includes("sea") ||
            (layer.type === "fill" && layer.source?.includes("water")))
        ) {
          try {
            const mapLayer = map.getLayer(layerId);
            if (mapLayer) {
              // Try to override fill color for water layers
              if (mapLayer.type === "fill") {
                map.setPaintProperty(layerId, "fill-color", "#18E3C5");
              }
            }
          } catch (e) {
            // Layer might not support fill-color, ignore
          }
        }
      });

      // Add background layer as fallback - this will show cyan color
      // in areas where there are no base map water layers
      if (!map.getLayer(backgroundLayerId)) {
        // Insert at the beginning of the layer stack (after any existing background)
        const firstLayer = allLayers.length > 0 ? 
          (typeof allLayers[0] === "string" ? allLayers[0] : allLayers[0].id) : 
          undefined;

        map.addLayer(
          {
            id: backgroundLayerId,
            type: "background",
            paint: {
              "background-color": "#18E3C5", // Cyan color for water
            },
          },
          firstLayer // Insert before first layer (if any)
        );
      }
    };

    // Try immediately and also after style loads
    updateWaterColor();

    // Listen for style changes (when base map loads)
    const handleStyleData = () => {
      updateWaterColor();
    };

    map.on("styledata", handleStyleData);

    return () => {
      map.off("styledata", handleStyleData);
      try {
        if (map.getLayer(backgroundLayerId)) {
          map.removeLayer(backgroundLayerId);
        }
      } catch {
        // Ignore errors during cleanup
      }
    };
  }, [isLoaded, map, backgroundLayerId]);

  return null;
}

