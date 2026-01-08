"use client";

import { useEffect } from "react";
import { useMap } from "@/components/ui/map";

interface CountriesLayerProps {
  /** Color for land/continents fill (default: #8B5CF6 - purple) */
  landColor?: string;
}

/**
 * Component that modifies the base map's land/continent layers to use purple color
 * Instead of adding GeoJSON layers (which have low resolution and misaligned borders),
 * this component directly modifies the base map style layers to change land color.
 * This ensures perfect alignment with the base map's accurate boundaries.
 */
export function CountriesLayer({ landColor = "#8B5CF6" }: CountriesLayerProps) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;

    // Function to update land layer colors in the base map
    const updateLandColor = () => {
      const style = map.getStyle();
      const allLayers = style.layers || [];

      console.log("🎨 Applying land color:", landColor);

      // MAIN FIX: The primary land/continent layer is the "background" layer with type "background"
      // This is what makes continents black by default
      allLayers.forEach((layer) => {
        if (typeof layer === "string") return;

        // Change the main background layer (continents)
        if (layer.id === "background" && layer.type === "background") {
          try {
            map.setPaintProperty("background", "background-color", landColor);
            console.log("✓ Modified MAIN land layer: background");
          } catch (error) {
            console.log("✗ Failed to modify background:", error);
          }
        }

        // Also modify other land-related fill layers for consistency
        if (layer.type === "fill") {
          const layerId = layer.id.toLowerCase();
          
          // Skip water layers
          const isWaterLayer =
            layerId.includes("water") ||
            layerId.includes("ocean") ||
            layerId.includes("sea") ||
            layerId.includes("lake") ||
            layerId.includes("river");

          if (!isWaterLayer) {
            try {
              map.setPaintProperty(layer.id, "fill-color", landColor);
              console.log(`✓ Modified fill layer: ${layer.id}`);
            } catch (error) {
              // Some layers might not support this property
            }
          }
        }
      });

      console.log("✅ Land color update complete");
    };

    // Try immediately and also after style loads/changes
    updateLandColor();

    // Listen for style changes (when base map loads or theme changes)
    const handleStyleData = () => {
      // Use a small timeout to ensure style is fully loaded
      setTimeout(updateLandColor, 100);
    };

    map.on("styledata", handleStyleData);

    return () => {
      map.off("styledata", handleStyleData);
    };
  }, [isLoaded, map, landColor]);

  return null;
}

