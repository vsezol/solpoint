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

function makeInteractive(svg: SVGSVGElement, onZoneClick: (zoneId: string) => void) {
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
      zone.style.transformOrigin = "center center";

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
        zone.style.transform = `scale(${s})`;
      };

      const applyHover = (hover: boolean) => {
        setScale(hover ? HOVER_SCALE_SETTLE : 1);
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
const ZOOM_SENSITIVITY = 0.002;

export function Token2049Map() {
  const [popupZone, setPopupZone] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<AttendeeItem[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bookedMessage, setBookedMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panZoomRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });
  const pinchRef = useRef<{ distance: number; centerX: number; centerY: number; scale: number; translateX: number; translateY: number } | null>(null);

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
    makeInteractive(svg as unknown as SVGSVGElement, handleZoneClick);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const center = getTouchCenter(e.touches);
      pinchRef.current = {
        distance: getTouchDistance(e.touches),
        centerX: center.x,
        centerY: center.y,
        scale,
        translateX: translate.x,
        translateY: translate.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dist = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const ratio = dist / pinchRef.current.distance;
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.scale * ratio));
      const dx = center.x - pinchRef.current.centerX;
      const dy = center.y - pinchRef.current.centerY;
      const newX = pinchRef.current.translateX + dx;
      const newY = pinchRef.current.translateY + dy;
      setScale(newScale);
      setTranslate({ x: newX, y: newY });
      pinchRef.current = { distance: dist, centerX: center.x, centerY: center.y, scale: newScale, translateX: newX, translateY: newY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
  };

  useEffect(() => {
    const el = panZoomRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      setScale((s) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

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
      <div
        ref={containerRef}
        className="relative w-full h-full min-h-[calc(60vh+300px)] rounded-lg overflow-hidden border border-[var(--color-surface-border)] bg-[var(--color-surface)] select-none"
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
                src="/interactive-maps/token2049/map-hotel.svg"
                beforeInjection={(svg) => {
                  onInjection(svg as unknown as SVGSVGElement);
                }}
                className="w-full h-full [&>div]:!block [&>div]:!h-full [&>div_svg]:!w-full [&>div_svg]:!h-full [&>div_svg]:!max-w-full [&>div_svg]:!max-h-full"
              />
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
