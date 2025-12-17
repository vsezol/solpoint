"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { attendEvent } from "./actions";
import { useRouter } from "next/navigation";

interface AttendButtonProps {
  eventId: string;
  isRegistered: boolean;
  isPaid: boolean;
  priceSol?: number;
}

export function AttendButton({ eventId, isRegistered, isPaid, priceSol }: AttendButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAttend = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await attendEvent(eventId);
      
      if (result.success) {
        // Обновляем страницу для отображения изменений
        router.refresh();
      } else {
        setError(result.error || "Failed to register");
      }
    } catch (err) {
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

