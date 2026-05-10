"use client";

import { useEffect } from "react";
import { useMap } from "@/components/ui/map";

interface CountriesLayerProps {
  /** Color for land/continents fill (default: #452D9F - purple from design) */
  landColor?: string;
}

/**
 * Component that modifies the base map's land/continent layers to use purple color palette
 * Instead of adding GeoJSON layers (which have low resolution and misaligned borders),
 * this component directly modifies the base map style layers to change land colors.
 * This ensures perfect alignment with the base map's accurate boundaries.
 * 
 * Uses a palette of purple shades to maintain map detail differentiation:
 * - Base land: #452D9F (from design)
 * - Vegetation/landcover: #5A3FB5 (lighter)
 * - Parks/nature: #6B4FC9 (even lighter)
 * - Residential areas: #3F2890 (darker than base)
 * - Buildings: #352075 (darkest)
 */
export function CountriesLayer({ landColor = "#452D9F" }: CountriesLayerProps) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;

    // Purple color palette for different land types
    // This maintains visual differentiation while keeping everything in purple tones
    const colorPalette = {
      base: landColor,              // #452D9F - Base land/continents
      vegetation: "#5A3FB5",         // Lighter - forests, fields, landcover
      parks: "#6B4FC9",              // Even lighter - parks, nature reserves
      residential: "#3F2890",        // Darker than base - residential areas
      buildings: "#352075",          // Darkest - buildings and structures
    };

    // Function to update land layer colors in the base map
    const updateLandColor = () => {
      const style = map.getStyle();
      if (!style) return;
      const allLayers = style.layers ?? [];

      allLayers.forEach((layer) => {
        if (typeof layer === "string") return;

        // 1. Change the main background layer (base continents)
        if (layer.id === "background" && layer.type === "background") {
          try {
            map.setPaintProperty("background", "background-color", colorPalette.base);
          } catch {
            // Ignore if property can't be set
          }
          return;
        }

        // 2. Apply specific colors to different fill layer types
        if (layer.type === "fill") {
          const layerId = layer.id.toLowerCase();
          
          // Skip water layers
          const isWaterLayer =
            layerId.includes("water") ||
            layerId.includes("ocean") ||
            layerId.includes("sea") ||
            layerId.includes("lake") ||
            layerId.includes("river");

          if (isWaterLayer) return;

          // Determine which color to use based on layer purpose
          let targetColor = colorPalette.base; // default

          if (layerId.includes("landcover")) {
            targetColor = colorPalette.vegetation;
          } else if (layerId.includes("park")) {
            targetColor = colorPalette.parks;
          } else if (layerId.includes("residential")) {
            targetColor = colorPalette.residential;
          } else if (layerId.includes("building")) {
            targetColor = colorPalette.buildings;
          } else if (layerId.includes("landuse")) {
            targetColor = colorPalette.vegetation;
          }

          try {
            map.setPaintProperty(layer.id, "fill-color", targetColor);
          } catch {
            // Some layers might not support this property
          }
        }
      });
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

