"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ReactSVG } from "react-svg";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Button,
  Avatar,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { Loader2, Maximize, Minimize } from "lucide-react";

type AttendeeItem = { id: string; name: string; avatar_url: string | null };

const HIT_PADDING = 8;

function getFillableDescendants(el: SVGElement, excludeHitArea = false): SVGElement[] {
  const tagNames = ["path", "rect", "circle", "ellipse", "polygon", "polyline"];
  const list = Array.from(el.querySelectorAll<SVGElement>(tagNames.join(",")));
  if (!excludeHitArea) return list;
  return list.filter((t) => !t.hasAttribute("data-hit-area") && !t.hasAttribute("data-radar"));
}

function ensureHitArea(zone: SVGElement): SVGElement {
  const tag = zone.tagName.toLowerCase();
  if (tag === "g") {
    const existing = zone.querySelector("[data-hit-area]");
    if (existing) return zone;
    try {
      const bbox = (zone as SVGGraphicsElement).getBBox();
      const rect = zone.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(bbox.x - HIT_PADDING));
      rect.setAttribute("y", String(bbox.y - HIT_PADDING));
      rect.setAttribute("width", String(bbox.width + 2 * HIT_PADDING));
      rect.setAttribute("height", String(bbox.height + 2 * HIT_PADDING));
      rect.setAttribute("fill", "transparent");
      rect.setAttribute("data-hit-area", "true");
      rect.setAttribute("pointer-events", "all");
      zone.insertBefore(rect, zone.firstChild);
    } catch (_) {}
    return zone;
  }
  if (tag === "path") {
    const parent = zone.parentNode as SVGElement | null;
    if (!parent || parent.tagName.toLowerCase() !== "g") return zone;
    if (parent.querySelector("[data-hit-area]")) return parent;
    try {
      const bbox = (zone as SVGGraphicsElement).getBBox();
      const rect = zone.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(bbox.x - HIT_PADDING));
      rect.setAttribute("y", String(bbox.y - HIT_PADDING));
      rect.setAttribute("width", String(bbox.width + 2 * HIT_PADDING));
      rect.setAttribute("height", String(bbox.height + 2 * HIT_PADDING));
      rect.setAttribute("fill", "transparent");
      rect.setAttribute("data-hit-area", "true");
      rect.setAttribute("pointer-events", "all");
      parent.insertBefore(rect, zone);
      parent.setAttribute("data-zone-id", zone.getAttribute("id") || "zone");
      return parent;
    } catch (_) {
      return zone;
    }
  }
  return zone;
}

/** Detect the dominant color of a zone's visible children */
function detectZoneColor(zone: SVGElement): string {
  const skip = new Set(["none", "rgb(0, 0, 0)", "rgb(255, 255, 255)", "rgba(0, 0, 0, 0)", "transparent"]);
  const children = zone.querySelectorAll("path, rect, circle, ellipse, polygon, polyline");
  const colorCounts = new Map<string, number>();
  children.forEach((el) => {
    if (el.hasAttribute("data-hit-area") || el.hasAttribute("data-radar")) return;
    const computed = getComputedStyle(el);
    for (const val of [computed.stroke, computed.fill]) {
      if (val && !skip.has(val) && !val.includes("url(")) {
        colorCounts.set(val, (colorCounts.get(val) || 0) + 1);
      }
    }
  });
  let best = "#14f195";
  let bestCount = 0;
  colorCounts.forEach((count, color) => {
    if (count > bestCount) { bestCount = count; best = color; }
  });
  return best;
}

function injectRadarStyles(svg: SVGSVGElement, variant: "local" | "full") {
  if (svg.querySelector("style[data-radar]")) return;
  const maxScale = variant === "local" ? 2 : 2.5;
  const duration = variant === "local" ? 2 : 1.8;
  const strokeWidth = variant === "local" ? 1.5 : 12;
  const delay1 = (duration / 3).toFixed(1);
  const delay2 = ((duration * 2) / 3).toFixed(1);
  const style = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "style");
  style.setAttribute("data-radar", "true");
  style.textContent = `
    @keyframes radar-pulse {
      0% { transform: scale(1); opacity: 0.45; }
      100% { transform: scale(${maxScale}); opacity: 0; }
    }
    .radar-ring-group { pointer-events: none; }
    .radar-ring {
      fill: none;
      stroke-width: ${strokeWidth};
      pointer-events: none;
      opacity: 0;
      will-change: transform, opacity;
      animation: radar-pulse ${duration}s ease-out infinite;
    }
    .radar-ring--delay-1 { animation-delay: ${delay1}s; }
    .radar-ring--delay-2 { animation-delay: ${delay2}s; }
  `;
  const defs = svg.querySelector("defs");
  if (defs) {
    defs.appendChild(style);
  } else {
    svg.insertBefore(style, svg.firstChild);
  }
}

function addRadarWaveToZone(zone: SVGElement, svg: SVGSVGElement) {
  if (zone.querySelector("[data-radar]")) return;
  const ns = "http://www.w3.org/2000/svg";
  const doc = svg.ownerDocument;

  let cx: number, cy: number, baseRadius: number;
  try {
    const bbox = (zone as SVGGraphicsElement).getBBox();
    cx = bbox.x + bbox.width / 2;
    cy = bbox.y + bbox.height / 2;
    baseRadius = Math.max(bbox.width, bbox.height) / 2;
  } catch {
    return;
  }

  const color = detectZoneColor(zone);

  const group = doc.createElementNS(ns, "g");
  group.setAttribute("class", "radar-ring-group");
  group.setAttribute("data-radar", "true");

  const delays = ["", "radar-ring--delay-1", "radar-ring--delay-2"];
  for (let i = 0; i < 3; i++) {
    const circle = doc.createElementNS(ns, "circle");
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", String(baseRadius * 0.6));
    circle.setAttribute("class", `radar-ring ${delays[i]}`.trim());
    circle.setAttribute("data-radar", "true");
    circle.style.stroke = color;
    circle.style.transformOrigin = `${cx}px ${cy}px`;
    group.appendChild(circle);
  }

  zone.insertBefore(group, zone.firstChild);
}

type MakeInteractiveOptions = {
  mapVariant: "local" | "full";
  onSwitchToLocalMap?: () => void;
};

function makeInteractive(
  svg: SVGSVGElement,
  onZoneClick: (zoneId: string) => void,
  options: MakeInteractiveOptions
) {
  const { mapVariant, onSwitchToLocalMap } = options;

  injectRadarStyles(svg, mapVariant);

  if (mapVariant === "full" && onSwitchToLocalMap) {
    const pin41Labels = svg.querySelectorAll<SVGElement>('[aria-label="41"]');
    pin41Labels.forEach((labelEl) => {
      const prev = labelEl.previousElementSibling as SVGElement | null;
      if (!prev) return;

      // Distinguish map pin from legend entry:
      // Map pins alternate (pink shape path → white text path), so prev-prev
      // of the label text is a different pin's text (has aria-label).
      // Legend entries have 2+ consecutive non-labeled pink paths before text.
      const prevPrev = prev.previousElementSibling as SVGElement | null;
      if (!prevPrev || !prevPrev.getAttribute("aria-label")) return;

      // Wrap pink shape + white text (2 elements for map pins)
      const nodesToWrap = [prev, labelEl];
      const g = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("data-zone-id", "pin-41");
      g.setAttribute("data-pin-41", "true");
      const parent = prev.parentNode;
      if (!parent) return;
      parent.insertBefore(g, prev);
      nodesToWrap.forEach((n) => g.appendChild(n));

      const zone = ensureHitArea(g);
      zone.style.cursor = "pointer";

      addRadarWaveToZone(zone, svg);

      // Hover glow
      zone.addEventListener("mouseover", () => {
        zone.style.filter = "brightness(1.3) drop-shadow(0 0 8px #d669bb)";
      });
      zone.addEventListener("mouseout", () => {
        zone.style.filter = "";
      });

      zone.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSwitchToLocalMap();
      });

      const zoneWithTouch = zone as SVGElement & { _pinTouchStart?: { x: number; y: number } };
      const TAP_MOVE_THRESHOLD = 24;
      zone.addEventListener("touchstart", (e: TouchEvent) => {
        if (e.touches.length === 1) {
          zoneWithTouch._pinTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          zone.style.filter = "brightness(1.3) drop-shadow(0 0 8px #d669bb)";
        }
      }, { passive: true });
      zone.addEventListener("touchend", (e: TouchEvent) => {
        zone.style.filter = "";
        if (zoneWithTouch._pinTouchStart && e.changedTouches.length === 1) {
          const t = e.changedTouches[0];
          const dx = t.clientX - zoneWithTouch._pinTouchStart.x;
          const dy = t.clientY - zoneWithTouch._pinTouchStart.y;
          if (Math.hypot(dx, dy) < TAP_MOVE_THRESHOLD) {
            e.preventDefault();
            onSwitchToLocalMap();
          }
        }
        zoneWithTouch._pinTouchStart = undefined;
      }, { passive: false });
    });
  }

  if (mapVariant !== "local") return;

  const interactiveSelectors = [
    '[id="reception"]',
    '[id="reception-g"]',
    '[id="conference-office"]',
  ];

  interactiveSelectors.forEach((selector) => {
    const elements = svg.querySelectorAll<SVGElement>(selector);
    elements.forEach((el) => {
      const zone = ensureHitArea(el);
      zone.style.cursor = "pointer";

      addRadarWaveToZone(zone, svg);

      const zoneId = zone.getAttribute("data-zone-id") || zone.getAttribute("id") || "zone";

      // Hover: use CSS filter for clean glow effect — no color tracking needed
      zone.addEventListener("mouseover", () => {
        zone.style.filter = "brightness(1.6) drop-shadow(0 0 6px #14f195)";
      });
      zone.addEventListener("mouseout", () => {
        zone.style.filter = "";
      });

      zone.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onZoneClick(zoneId);
      });

      const TAP_MOVE_THRESHOLD = 24;
      const zoneWithTouch = zone as SVGElement & { _zoneTouchStart?: { x: number; y: number } };

      zone.addEventListener("touchstart", (e: TouchEvent) => {
        if (e.touches.length === 1) {
          zoneWithTouch._zoneTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          zone.style.filter = "brightness(1.6) drop-shadow(0 0 6px #14f195)";
        }
      }, { passive: true });

      zone.addEventListener("touchend", (e: TouchEvent) => {
        zone.style.filter = "";
        if (zoneWithTouch._zoneTouchStart && e.changedTouches.length === 1) {
          const t = e.changedTouches[0];
          const dx = t.clientX - zoneWithTouch._zoneTouchStart.x;
          const dy = t.clientY - zoneWithTouch._zoneTouchStart.y;
          if (Math.hypot(dx, dy) < TAP_MOVE_THRESHOLD) {
            e.preventDefault();
            onZoneClick(zoneId);
          }
        }
        zoneWithTouch._zoneTouchStart = undefined;
      }, { passive: false });

      zone.addEventListener("touchcancel", () => {
        zone.style.filter = "";
        zoneWithTouch._zoneTouchStart = undefined;
      }, { passive: true });
    });
  });
}

function formatZoneTitle(zoneId: string): string {
  return zoneId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;
const ZOOM_SENSITIVITY_LOCAL = 0.002;
const ZOOM_SENSITIVITY_FULL = 0.005;
const PINCH_ZOOM_MULTIPLIER_LOCAL = 1.55;
const PINCH_ZOOM_MULTIPLIER_FULL = 2.4;

const MAP_SOURCES = {
  local: "/interactive-maps/token2049/map-hotel.svg",
  full: "/interactive-maps/token2049/full-hotel.svg",
} as const;
type MapVariant = keyof typeof MAP_SOURCES;

export function Token2049Map() {
  const [popupZone, setPopupZone] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<AttendeeItem[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bookedMessage, setBookedMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panZoomRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);

  const [mapVariant, setMapVariant] = useState<MapVariant>("local");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Use refs for transform values to avoid re-renders during pan/zoom
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });
  const pinchRef = useRef<{ distance: number; centerX: number; centerY: number; scale: number; translateX: number; translateY: number } | null>(null);
  const touchPanRef = useRef<{ startX: number; startY: number; translateX: number; translateY: number } | null>(null);

  const mapSrc = MAP_SOURCES[mapVariant];

  /** Apply transform directly to DOM — no React re-render */
  const applyTransform = useCallback(() => {
    if (!transformRef.current) return;
    const { x, y } = translateRef.current;
    const s = scaleRef.current;
    transformRef.current.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }, []);

  const switchMap = (variant: MapVariant) => {
    if (variant === mapVariant) return;
    setMapVariant(variant);
    scaleRef.current = 1;
    translateRef.current = { x: 0, y: 0 };
    applyTransform();
  };

  useEffect(() => {
    if (!popupZone) {
      setAttendees([]);
      setSelectedId(null);
      setBookedMessage(null);
      return;
    }
    let cancelled = false;
    setAttendeesLoading(true);
    setAttendees([]);
    (async () => {
      try {
        const eventsRes = await fetch("/api/events?upcoming=true&limit=1");
        if (!eventsRes.ok || cancelled) return;
        const { events } = await eventsRes.json();
        const event = events?.[0];
        if (!event?.slug || cancelled) {
          setAttendeesLoading(false);
          return;
        }
        const membersRes = await fetch(`/api/events/${event.slug}/members`);
        if (!membersRes.ok || cancelled) {
          setAttendeesLoading(false);
          return;
        }
        const { internal = [], external = [] } = await membersRes.json();
        const list: AttendeeItem[] = [
          ...(internal || [])
            .filter((m: { user?: unknown }) => m.user)
            .map((m: { user: { id: string; twitter_name?: string; twitter_handle?: string; avatar_url?: string | null } }) => ({
              id: m.user.id,
              name: m.user.twitter_name || m.user.twitter_handle || "Unknown",
              avatar_url: m.user.avatar_url ?? null,
            })),
          ...(external || []).map((e: { id: string; name?: string | null; avatar?: string | null }) => ({
            id: e.id,
            name: e.name || "Unknown",
            avatar_url: e.avatar ?? null,
          })),
        ];
        if (!cancelled) setAttendees(list);
      } catch (_) {
        if (!cancelled) setAttendees([]);
      } finally {
        if (!cancelled) setAttendeesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [popupZone]);

  const handleZoneClick = (zoneId: string) => {
    containerRef.current?.dispatchEvent(
      new CustomEvent("mapzoneclick", { detail: { zoneId }, bubbles: true })
    );
  };

  const onBeforeInjection = (svg: SVGSVGElement) => {
    svg.setAttribute("style", "width: 100%; height: 100%;");
    svg.style.display = "block";
  };

  const onAfterInjection = (svg: SVGSVGElement) => {
    makeInteractive(svg as unknown as SVGSVGElement, handleZoneClick, {
      mapVariant,
      onSwitchToLocalMap: () => switchMap("local"),
    });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: CustomEvent<{ zoneId: string }>) => {
      setPopupZone(e.detail.zoneId);
    };
    el.addEventListener("mapzoneclick", handler as EventListener);
    return () => el.removeEventListener("mapzoneclick", handler as EventListener);
  }, []);

  // Fullscreen
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  const selectedAttendee = selectedId ? attendees.find((a) => a.id === selectedId) : null;

  const handleBook = () => {
    if (selectedAttendee) {
      setBookedMessage(`Meeting with ${selectedAttendee.name} was booked.`);
    }
  };

  const handleCloseModal = () => {
    setPopupZone(null);
    setAttendees([]);
    setSelectedId(null);
    setBookedMessage(null);
  };

  const isTouchOnZone = (target: EventTarget | null) =>
    target && (target as Element).closest?.('[id="reception"], [id="reception-g"], [id="conference-office"], [data-zone-id]');

  // Mouse pan — direct DOM manipulation, no React state during drag
  useEffect(() => {
    const el = panZoomRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Element;
      if (target.closest?.('[id="reception"], [id="reception-g"], [id="conference-office"], [data-zone-id]')) return;
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX, y: e.clientY,
        translateX: translateRef.current.x, translateY: translateRef.current.y,
      };
      el.style.cursor = "grabbing";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      translateRef.current = {
        x: panStartRef.current.translateX + e.clientX - panStartRef.current.x,
        y: panStartRef.current.translateY + e.clientY - panStartRef.current.y,
      };
      applyTransform();
    };

    const onMouseUp = () => {
      if (!isPanningRef.current) return;
      isPanningRef.current = false;
      el.style.cursor = "";
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [applyTransform]);

  // Touch pan & pinch — native events, direct DOM manipulation
  useEffect(() => {
    const el = panZoomRef.current;
    if (!el) return;

    const getTouchDist = (t: TouchList) =>
      Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
    const getTouchCenter = (t: TouchList) => ({
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2,
    });

    const pinchMultiplier = mapVariant === "full" ? PINCH_ZOOM_MULTIPLIER_FULL : PINCH_ZOOM_MULTIPLIER_LOCAL;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        touchPanRef.current = null;
        const center = getTouchCenter(e.touches);
        pinchRef.current = {
          distance: getTouchDist(e.touches),
          centerX: center.x,
          centerY: center.y,
          scale: scaleRef.current,
          translateX: translateRef.current.x,
          translateY: translateRef.current.y,
        };
      } else if (e.touches.length === 1 && !isTouchOnZone(e.target)) {
        touchPanRef.current = {
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          translateX: translateRef.current.x,
          translateY: translateRef.current.y,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        touchPanRef.current = null;
        const dist = getTouchDist(e.touches);
        const center = getTouchCenter(e.touches);
        const ratio = dist / pinchRef.current.distance;
        const adjustedRatio = 1 + (ratio - 1) * pinchMultiplier;
        const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.scale * adjustedRatio));
        const dx = center.x - pinchRef.current.centerX;
        const dy = center.y - pinchRef.current.centerY;
        const newX = pinchRef.current.translateX + dx;
        const newY = pinchRef.current.translateY + dy;
        scaleRef.current = newScale;
        translateRef.current = { x: newX, y: newY };
        applyTransform();
        pinchRef.current = { distance: dist, centerX: center.x, centerY: center.y, scale: newScale, translateX: newX, translateY: newY };
      } else if (e.touches.length === 1 && touchPanRef.current) {
        e.preventDefault();
        translateRef.current = {
          x: touchPanRef.current.translateX + e.touches[0].clientX - touchPanRef.current.startX,
          y: touchPanRef.current.translateY + e.touches[0].clientY - touchPanRef.current.startY,
        };
        applyTransform();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 1 && pinchRef.current) {
        pinchRef.current = null;
        touchPanRef.current = {
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          translateX: translateRef.current.x,
          translateY: translateRef.current.y,
        };
      } else if (e.touches.length < 2) {
        pinchRef.current = null;
      }
      if (e.touches.length === 0) {
        touchPanRef.current = null;
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [mapVariant, applyTransform]);

  // Wheel zoom — direct DOM manipulation
  useEffect(() => {
    const el = panZoomRef.current;
    if (!el) return;
    const sensitivity = mapVariant === "full" ? ZOOM_SENSITIVITY_FULL : ZOOM_SENSITIVITY_LOCAL;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * sensitivity;
      scaleRef.current = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scaleRef.current + delta));
      applyTransform();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [mapVariant, applyTransform]);

  return (
    <>
      <div className="flex flex-col h-full min-h-0 w-full">
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <span className="text-sm text-[var(--color-text-secondary)]">Map:</span>
          <div
            className="inline-flex rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-0.5"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mapVariant === "local"}
              onClick={() => switchMap("local")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                mapVariant === "local"
                  ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              Local map
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mapVariant === "full"}
              onClick={() => switchMap("full")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                mapVariant === "full"
                  ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              Full map
            </button>
          </div>
        </div>
        <div
          ref={containerRef}
          className="relative flex-1 w-full min-h-[calc(60vh+300px)] rounded-lg overflow-hidden border border-[var(--color-surface-border)] bg-[var(--color-surface)] select-none"
        >
          {/* Fullscreen button */}
          <button
            type="button"
            onClick={handleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="absolute top-3 right-3 z-20 flex items-center justify-center size-9 rounded-md border border-[var(--color-surface-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>

          <div
            ref={panZoomRef}
            className="absolute inset-0 overflow-hidden cursor-grab"
            style={{ touchAction: "none" }}
          >
            <div
              ref={transformRef}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: "translate(0px, 0px) scale(1)",
                transformOrigin: "50% 50%",
                willChange: "transform",
              }}
            >
              <div className="w-full h-full min-w-full min-h-full" style={{ aspectRatio: "1/1", maxWidth: "100%", maxHeight: "100%" }}>
                <ReactSVG
                  key={mapSrc}
                  src={mapSrc}
                  beforeInjection={(svg) => {
                    onBeforeInjection(svg as unknown as SVGSVGElement);
                  }}
                  afterInjection={(svg) => {
                    onAfterInjection(svg as unknown as SVGSVGElement);
                  }}
                  className="w-full h-full [&>div]:!block [&>div]:!h-full [&>div_svg]:!w-full [&>div_svg]:!h-full [&>div_svg]:!max-w-full [&>div_svg]:!max-h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={popupZone !== null}
        onClose={handleCloseModal}
        closeOnOverlayClick
        showCloseButton
        size="sm"
      >
        <ModalHeader>
          <ModalTitle>
            {popupZone ? `Booking the meeting at ${formatZoneTitle(popupZone)}` : ""}
          </ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            You can book the meeting.
          </p>
          {attendeesLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" aria-hidden />
            </div>
          ) : attendees.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No attendees for this event yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {attendees.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 border transition-colors",
                    selectedId === a.id
                      ? "border-[var(--color-primary)] bg-[var(--color-surface-hover)]"
                      : "border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]"
                  )}
                >
                  <Avatar src={a.avatar_url} alt={a.name} size="sm" />
                  <span className="text-sm text-[var(--color-text-primary)] truncate max-w-[120px]">
                    {a.name}
                  </span>
                </button>
              ))}
            </div>
          )}
          {bookedMessage && (
            <p className="mt-3 text-sm text-[var(--color-primary)] font-medium">{bookedMessage}</p>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleBook}
            disabled={!selectedId}
          >
            Book
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
