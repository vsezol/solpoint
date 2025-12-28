"use client";

import { useState } from "react";
import { Avatar, Button, ProSubscriptionModal } from "@/components/ui";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

interface AttendeeItem {
  id: string;
  avatar_url?: string | null;
  name: string;
  twitter_handle?: string;
  isVip?: boolean;
  isVerified?: boolean;
}

interface AttendeesListProps {
  title: string; // Например: "13 people going" или "3 friends going"
  items: AttendeeItem[];
  showAllText?: string; // Например: "Show all attendees" или "Show all friends"
  showAllHref?: string; // URL для "Show all" (вместо onShowAll для Server Components)
  capacityInfo?: string; // Например: "Unlimited spots left" или "5 spots left"
  ctaButtonText?: string; // Например: "Invite friends to this event"
  ctaButtonHref?: string; // URL для CTA кнопки (вместо onCtaClick для Server Components)
  emptyText?: string; // Текст когда список пуст
  maxVisible?: number; // Максимальное количество видимых аватаров (по умолчанию 3)
}

export function AttendeesList({
  title,
  items,
  showAllText,
  showAllHref,
  capacityInfo,
  ctaButtonText,
  ctaButtonHref,
  emptyText = "No items yet",
  maxVisible = 3,
}: AttendeesListProps) {
  const { user, isAuthenticated } = useAuth();
  const isVip = user?.subscription_tier === "vip";
  const [showProModal, setShowProModal] = useState(false);
  const visibleItems = items.slice(0, maxVisible);
  const remainingCount = items.length - maxVisible;
  
  // Проверяем, является ли это "Show all attendees" (не "Show all friends")
  const isShowAllAttendees = showAllText?.toLowerCase().includes("attendees");

  return (
    <div className="space-y-2">
      {title && (
        <p className="text-sm text-[var(--color-text-secondary)] mb-2">
          {title}
        </p>
      )}
      
      {items.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2 mb-2">
            {visibleItems.map((item) => (
              <Link
                key={item.id}
                href={item.twitter_handle ? `/profile/${item.twitter_handle}` : "#"}
              >
                <Avatar
                  src={item.avatar_url}
                  alt={item.name}
                  size="sm"
                  isVip={item.isVip}
                  isVerified={item.isVerified}
                />
              </Link>
            ))}
            {remainingCount > 0 && (
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                +{remainingCount}
              </div>
            )}
          </div>

          {showAllText && (
            <div className="mb-2">
              {isShowAllAttendees && isAuthenticated && !isVip ? (
                <button
                  onClick={() => setShowProModal(true)}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  {showAllText}
                </button>
              ) : (
                <Link
                  href={showAllHref || "#"}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  {showAllText}
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] mb-2">{emptyText}</p>
      )}

      {capacityInfo && (
        <p className="text-xs text-[var(--color-text-muted)]">
          {capacityInfo}
        </p>
      )}

      {ctaButtonText && ctaButtonHref && (
        <Button
          variant="outline"
          className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
          size="sm"
          asChild
        >
          <Link href={ctaButtonHref}>
            {ctaButtonText}
          </Link>
        </Button>
      )}
      {isShowAllAttendees && (
        <ProSubscriptionModal
          isOpen={showProModal}
          onClose={() => setShowProModal(false)}
          title="This feature is available only with PRO subscription"
          description="Viewing all event attendees is available only with PRO subscription. Upgrade to PRO to unlock this feature."
        />
      )}
    </div>
  );
}

