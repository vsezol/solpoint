"use client";

import { useEffect } from "react";

import { trackError, trackEvent } from "@/lib/analytics";

function getElementContext(target: EventTarget | null): Record<string, unknown> | null {
  if (!(target instanceof Element)) return null;

  const clickable = target.closest("button, a, [role='button'], [data-analytics-click]");
  if (!clickable) return null;

  const text = (clickable.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120);
  const href = clickable instanceof HTMLAnchorElement ? clickable.href : null;

  return {
    tag: clickable.tagName.toLowerCase(),
    id: clickable.id || null,
    text: text || null,
    href,
    analytics_id: clickable.getAttribute("data-analytics-click"),
    class_name: clickable.getAttribute("class") || null,
  };
}

export function AppInstrumentation() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const elementContext = getElementContext(event.target);
      if (!elementContext) return;

      trackEvent("ui_click", {
        event_category: "UserInteraction",
        page_path: window.location.pathname,
        element_tag: String(elementContext.tag || ""),
        element_id: String(elementContext.id || ""),
        element_text: String(elementContext.text || ""),
        element_href: String(elementContext.href || ""),
        analytics_id: String(elementContext.analytics_id || ""),
      });
    };

    const onError = (event: ErrorEvent) => {
      trackError("window_error", {
        message: event.message || "Unknown window error",
        source: event.filename || null,
        line: event.lineno || null,
        column: event.colno || null,
        stack: event.error?.stack || null,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      let reason: unknown = event.reason;
      if (reason instanceof Error) {
        reason = {
          message: reason.message,
          stack: reason.stack || null,
          name: reason.name,
        };
      }
      trackError("unhandled_rejection", {
        reason: reason ?? null,
      });
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
