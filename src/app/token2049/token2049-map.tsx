"use client";

import React, { useState, useRef } from "react";
import { ReactSVG } from "react-svg";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Button,
} from "@/components/ui";

const HOVER_FILL = "#3b82f6";
const TRANSITION = "fill 0.25s ease, stroke 0.25s ease, transform 0.25s ease";
const HOVER_SCALE = 1.06;
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

      const applyHover = (hover: boolean) => {
        zone.style.transform = hover ? `scale(${HOVER_SCALE})` : "scale(1)";
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

      zone.addEventListener("mouseover", () => {
        if (hoverOffTimer !== null) {
          clearTimeout(hoverOffTimer);
          hoverOffTimer = null;
        }
        applyHover(true);
      });
      zone.addEventListener("mouseout", () => {
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

export function Token2049Map() {
  const [popupZone, setPopupZone] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: CustomEvent<{ zoneId: string }>) => {
      setPopupZone(e.detail.zoneId);
    };
    el.addEventListener("mapzoneclick", handler as EventListener);
    return () => el.removeEventListener("mapzoneclick", handler as EventListener);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl mx-auto rounded-lg overflow-hidden border border-[var(--color-surface-border)] bg-[var(--color-surface)]"
        style={{ aspectRatio: "4/3", minHeight: "480px" }}
      >
        <ReactSVG
          src="/interactive-maps/token2049/map-hotel.svg"
          beforeInjection={(svg) => {
            onInjection(svg as unknown as SVGSVGElement);
          }}
          className="w-full h-full [&>div]:!block [&>div]:!h-full [&>div_svg]:!w-full [&>div_svg]:!h-full [&>div_svg]:!max-w-full [&>div_svg]:!max-h-full"
        />
      </div>

      <Modal
        isOpen={popupZone !== null}
        onClose={() => setPopupZone(null)}
        closeOnOverlayClick
        showCloseButton
        size="sm"
      >
        <ModalHeader>
          <ModalTitle>{popupZone ? formatZoneTitle(popupZone) : ""}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Book a meeting or use this space.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button variant="primary" onClick={() => {}}>
            Book
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
