"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { attendEvent } from "./actions";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

interface AttendButtonProps {
  eventId: string;
  eventSlug?: string;
  eventName?: string;
  eventType?: string;
  isRegistered: boolean;
  isPaid: boolean;
  priceSol?: number;
}

export function AttendButton({ 
  eventId, 
  eventSlug, 
  eventName, 
  eventType,
  isRegistered, 
  isPaid, 
  priceSol 
}: AttendButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAttend = async () => {
    setIsLoading(true);
    setError(null);

    trackEvent("event_attend_click", {
      event_category: "Events",
      event_label: eventSlug || eventId,
      event_id: eventId,
      event_slug: eventSlug,
      event_name: eventName,
      event_type: eventType,
      is_paid: isPaid,
      price_sol: priceSol || 0,
    });

    try {
      const result = await attendEvent(eventId);
      
      if (result.success) {
        trackEvent("event_attend_success", {
          event_category: "Events",
          event_label: eventSlug || eventId,
          event_id: eventId,
          event_slug: eventSlug,
          event_name: eventName,
          event_type: eventType,
          is_paid: isPaid,
          price_sol: priceSol || 0,
        });
        // Обновляем страницу для отображения изменений
        router.refresh();
      } else {
        trackEvent("event_attend_error", {
          event_category: "Events",
          event_label: eventSlug || eventId,
          event_id: eventId,
          error_message: result.error || "unknown",
        });
        setError(result.error || "Failed to register");
      }
    } catch (err) {
      trackEvent("event_attend_error", {
        event_category: "Events",
        event_label: eventSlug || eventId,
        event_id: eventId,
        error_message: err instanceof Error ? err.message : "unknown",
      });
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isRegistered) {
    return (
      <Button variant="outline" className="w-full" disabled>
        Already Registered
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        variant="primary"
        className="w-full"
        size="lg"
        onClick={handleAttend}
        disabled={isLoading}
        isLoading={isLoading}
      >
        {isPaid
          ? `Buy Tickets - ${priceSol || 0} SOL`
          : "Attend"}
      </Button>
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}

