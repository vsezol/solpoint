"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { Loader2 } from "lucide-react";

type AttendeeItem = { id: string; name: string; avatar_url: string | null };

const HOVER_FILL = "#9945ff";
const TRANSITION = "fill 0.25s ease, stroke 0.25s ease, transform 0.35s ease-out";
const HOVER_SCALE_SETTLE = 1.03;
const HOVER_SCALE_OVERSHOOT = 1.045;
const HOVER_WOBBLE_MS = 140;
const HOVER_OFF_DELAY_MS = 120;
const HIT_PADDING = 8;

const PULSE_DURATION_MS = 2500;
const PULSE_SCALE_MIN = 1;
const PULSE_SCALE_MAX = 1.0075;

function getFillableDescendants(el: SVGElement, excludeHitArea = false): SVGElement[] {
  const tagNames = ["path", "rect", "circle", "ellipse", "polygon", "polyline"];
  const list = Array.from(el.querySelectorAll<SVGElement>(tagNames.join(",")));
  if (!excludeHitArea) return list;
  return list.filter((t) => !t.hasAttribute("data-hit-area"));
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

/** Wraps zone content so scale is applied from geometric center (element grows/shrinks in place, no drift). */
function wrapZoneContentForCenterScale(zone: SVGElement): { pulseScaleGroup: SVGGElement; pulseAnim: SVGAnimateElement } {
  const doc = zone.ownerDocument;
  const ns = "http://www.w3.org/2000/svg";
  const bbox = (zone as SVGGraphicsElement).getBBox();
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;

  const outer = doc.createElementNS(ns, "g");
  outer.setAttribute("transform", `translate(${cx},${cy})`);
  const middle = doc.createElementNS(ns, "g");
  middle.setAttribute("data-pulse-scale", "true");
  const inner = doc.createElementNS(ns, "g");
  inner.setAttribute("transform", `translate(${-cx},${-cy})`);

  while (zone.firstChild) {
    inner.appendChild(zone.firstChild);
  }

  const anim = doc.createElementNS(ns, "animateTransform");
  anim.setAttribute("attributeName", "transform");
  anim.setAttribute("type", "scale");
  anim.setAttribute("values", `${PULSE_SCALE_MIN};${PULSE_SCALE_MAX};${PULSE_SCALE_MIN}`);
  anim.setAttribute("keyTimes", "0;0.5;1");
  anim.setAttribute("dur", `${PULSE_DURATION_MS / 1000}s`);
  anim.setAttribute("repeatCount", "indefinite");

  middle.appendChild(anim);
  middle.appendChild(inner);
  outer.appendChild(middle);
  zone.appendChild(outer);

  return { pulseScaleGroup: middle, pulseAnim: anim };
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

  if (mapVariant === "full" && onSwitchToLocalMap) {
    const pin41Labels = svg.querySelectorAll<SVGElement>('[aria-label="41"]');
    const processed = new Set<SVGElement>();
    pin41Labels.forEach((labelEl) => {
      const first = labelEl.previousElementSibling?.previousElementSibling as SVGElement | null;
      const start = first || labelEl;
      if (processed.has(start)) return;
      const nodesToWrap: SVGElement[] =
        first
          ? [first, first.nextElementSibling as SVGElement, labelEl]
          : [labelEl];
      const g = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("data-zone-id", "pin-41");
      g.setAttribute("data-pin-41", "true");
      const parent = start.parentNode;
      if (!parent) return;
      parent.insertBefore(g, start);
      nodesToWrap.forEach((n) => g.appendChild(n));
      processed.add(start);
      const zone = ensureHitArea(g);
      zone.style.cursor = "pointer";
      zone.style.transition = TRANSITION;

      const { pulseScaleGroup, pulseAnim } = wrapZoneContentForCenterScale(zone);

      const stopPulse = () => {
        if (pulseAnim.parentNode === pulseScaleGroup) {
          pulseScaleGroup.removeChild(pulseAnim);
        }
        pulseScaleGroup.setAttribute("transform", "scale(1)");
      };
      const startPulse = () => {
        pulseScaleGroup.removeAttribute("transform");
        if (pulseAnim.parentNode !== pulseScaleGroup) {
          pulseScaleGroup.appendChild(pulseAnim);
        }
      };

      zone.addEventListener("mouseover", stopPulse);
      zone.addEventListener("mouseout", startPulse);
      zone.addEventListener("touchstart", () => stopPulse(), { passive: true });
      zone.addEventListener("touchend", () => startPulse(), { passive: true });

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
        }
      }, { passive: true });
      zone.addEventListener("touchend", (e: TouchEvent) => {
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
      zone.style.transition = TRANSITION;

      const { pulseScaleGroup, pulseAnim } = wrapZoneContentForCenterScale(zone);
      (zone as SVGElement & { __pulseScaleGroup?: SVGGElement; __pulseAnim?: SVGAnimateElement }).__pulseScaleGroup = pulseScaleGroup;
      (zone as SVGElement & { __pulseScaleGroup?: SVGGElement; __pulseAnim?: SVGAnimateElement }).__pulseAnim = pulseAnim;

      let targets = getFillableDescendants(zone, true);
      if (targets.length === 0) {
        const path = zone.querySelector("path:not([data-hit-area])");
        if (path) targets = [path as SVGElement];
      }
      if (targets.length === 0) {
        targets = getFillableDescendants(zone, false).filter((t) => !t.hasAttribute("data-hit-area"));
      }

      targets.forEach((t) => {
        if (t.hasAttribute("data-hit-area")) return;
        const style = t.getAttribute("style") || "";
        const origFill =
          t.getAttribute("fill") ??
          (style.match(/fill:\s*([^;]+)/)?.[1]?.trim()) ??
          "#000000";
        t.setAttribute("data-original-fill", origFill);
        const hasStroke = style.includes("stroke:") && !style.includes("stroke:none");
        if (hasStroke) {
          t.setAttribute("data-original-stroke", t.getAttribute("stroke") ?? "#000000");
        }
      });

      const setScale = (s: number) => {
        if (pulseAnim.parentNode === pulseScaleGroup) {
          pulseScaleGroup.removeChild(pulseAnim);
        }
        pulseScaleGroup.setAttribute("transform", `scale(${s})`);
      };

      const restorePulse = () => {
        pulseScaleGroup.removeAttribute("transform");
        if (pulseAnim.parentNode !== pulseScaleGroup) {
          pulseScaleGroup.appendChild(pulseAnim);
        }
      };

      const applyHover = (hover: boolean) => {
        if (hover) {
          setScale(HOVER_SCALE_SETTLE);
        } else {
          setScale(1);
          restorePulse();
        }
        targets.forEach((t) => {
          if (t.hasAttribute("data-hit-area")) return;
          const origFill = t.getAttribute("data-original-fill") ?? "#000000";
          const origStroke = t.getAttribute("data-original-stroke");
          t.style.transition = TRANSITION;
          if (origFill && origFill !== "none") {
            t.style.fill = hover ? HOVER_FILL : origFill;
          }
          if (origStroke !== null) {
            t.style.stroke = hover ? HOVER_FILL : origStroke;
          }
        });
      };

      const zoneId = zone.getAttribute("data-zone-id") || zone.getAttribute("id") || "zone";
      let hoverOffTimer: ReturnType<typeof setTimeout> | null = null;
      let wobbleSettleTimer: ReturnType<typeof setTimeout> | null = null;

      zone.addEventListener("mouseover", () => {
        if (hoverOffTimer !== null) {
          clearTimeout(hoverOffTimer);
          hoverOffTimer = null;
        }
        if (wobbleSettleTimer !== null) {
          clearTimeout(wobbleSettleTimer);
          wobbleSettleTimer = null;
        }
        setScale(HOVER_SCALE_OVERSHOOT);
        targets.forEach((t) => {
          if (t.hasAttribute("data-hit-area")) return;
          const origFill = t.getAttribute("data-original-fill") ?? "#000000";
          const origStroke = t.getAttribute("data-original-stroke");
          t.style.transition = TRANSITION;
          t.style.fill = HOVER_FILL;
          if (origStroke !== null) t.style.stroke = HOVER_FILL;
        });
        wobbleSettleTimer = setTimeout(() => {
          wobbleSettleTimer = null;
          setScale(HOVER_SCALE_SETTLE);
        }, HOVER_WOBBLE_MS);
      });
      zone.addEventListener("mouseout", () => {
        if (wobbleSettleTimer !== null) {
          clearTimeout(wobbleSettleTimer);
          wobbleSettleTimer = null;
        }
        if (hoverOffTimer !== null) clearTimeout(hoverOffTimer);
        hoverOffTimer = setTimeout(() => {
          hoverOffTimer = null;
          applyHover(false);
        }, HOVER_OFF_DELAY_MS);
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
          applyHover(true);
        }
      }, { passive: true });

      zone.addEventListener("touchend", (e: TouchEvent) => {
        applyHover(false);
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
        applyHover(false);
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

  const [mapVariant, setMapVariant] = useState<MapVariant>("local");
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });
  const pinchRef = useRef<{ distance: number; centerX: number; centerY: number; scale: number; translateX: number; translateY: number } | null>(null);
  const touchPanRef = useRef<{ startX: number; startY: number; translateX: number; translateY: number } | null>(null);

  const mapSrc = MAP_SOURCES[mapVariant];

  const switchMap = (variant: MapVariant) => {
    if (variant === mapVariant) return;
    setMapVariant(variant);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
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

  const onInjection = (svg: SVGSVGElement) => {
    svg.setAttribute("style", "width: 100%; height: 100%;");
    svg.style.display = "block";
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = e.target as Element;
    const isClickableZone = el.closest?.('[id="reception"], [id="reception-g"], [id="conference-office"], [data-zone-id]');
    if (isClickableZone) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, translateX: translate.x, translateY: translate.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setTranslate({
      x: panStartRef.current.translateX + e.clientX - panStartRef.current.x,
      y: panStartRef.current.translateY + e.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsPanning(false);
  const handleMouseLeave = () => setIsPanning(false);

  const getTouchDistance = (touches: React.TouchList) =>
    Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY);
  const getTouchCenter = (touches: React.TouchList) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  });

  const isTouchOnZone = (target: EventTarget | null) =>
    target && (target as Element).closest?.('[id="reception"], [id="reception-g"], [id="conference-office"], [data-zone-id]');

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      touchPanRef.current = null;
      const center = getTouchCenter(e.touches);
      pinchRef.current = {
        distance: getTouchDistance(e.touches),
        centerX: center.x,
        centerY: center.y,
        scale,
        translateX: translate.x,
        translateY: translate.y,
      };
    } else if (e.touches.length === 1 && !isTouchOnZone(e.target)) {
      touchPanRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        translateX: translate.x,
        translateY: translate.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      touchPanRef.current = null;
      const dist = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const ratio = dist / pinchRef.current.distance;
      const pinchMultiplier = mapVariant === "full" ? PINCH_ZOOM_MULTIPLIER_FULL : PINCH_ZOOM_MULTIPLIER_LOCAL;
      const adjustedRatio = 1 + (ratio - 1) * pinchMultiplier;
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.scale * adjustedRatio));
      const dx = center.x - pinchRef.current.centerX;
      const dy = center.y - pinchRef.current.centerY;
      const newX = pinchRef.current.translateX + dx;
      const newY = pinchRef.current.translateY + dy;
      setScale(newScale);
      setTranslate({ x: newX, y: newY });
      pinchRef.current = { distance: dist, centerX: center.x, centerY: center.y, scale: newScale, translateX: newX, translateY: newY };
    } else if (e.touches.length === 1 && touchPanRef.current) {
      e.preventDefault();
      setTranslate({
        x: touchPanRef.current.translateX + e.touches[0].clientX - touchPanRef.current.startX,
        y: touchPanRef.current.translateY + e.touches[0].clientY - touchPanRef.current.startY,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) touchPanRef.current = null;
  };

  useEffect(() => {
    const el = panZoomRef.current;
    if (!el) return;
    const sensitivity = mapVariant === "full" ? ZOOM_SENSITIVITY_FULL : ZOOM_SENSITIVITY_LOCAL;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * sensitivity;
      setScale((s) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [mapVariant]);

  useEffect(() => {
    const onMouseUp = () => setIsPanning(false);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mouseleave", onMouseUp);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mouseleave", onMouseUp);
    };
  }, []);

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
          style={{ touchAction: "none" }}
        >
        <div
          ref={panZoomRef}
          className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: "50% 50%",
            }}
          >
            <div className="w-full h-full min-w-full min-h-full" style={{ aspectRatio: "1/1", maxWidth: "100%", maxHeight: "100%" }}>
              <ReactSVG
                key={mapSrc}
                src={mapSrc}
                beforeInjection={(svg) => {
                  onInjection(svg as unknown as SVGSVGElement);
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
