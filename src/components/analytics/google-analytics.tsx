"use client";

import Script from "next/script";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

interface GoogleAnalyticsProps {
  nonce?: string;
}

function GoogleAnalyticsInner({ nonce }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

  useEffect(() => {
    if (!measurementId || !pathname) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    trackPageView(url);
  }, [pathname, searchParams, measurementId]);

  useEffect(() => {
    if (!pathname) return;
    const path = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    const referrer = typeof document !== "undefined" ? document.referrer : "";

    fetch("/api/analytics/visit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path, referrer }),
      keepalive: true,
    }).catch(() => {
      // Best-effort analytics endpoint.
    });
  }, [pathname, searchParams]);

  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', { page_path: window.location.pathname });
          `,
        }}
      />
    </>
  );
}

export function GoogleAnalytics({ nonce }: GoogleAnalyticsProps) {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner nonce={nonce} />
    </Suspense>
  );
}
