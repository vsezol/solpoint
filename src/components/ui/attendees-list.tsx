"use client";

import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { Avatar, Button, AuthRequiredModal, ProSubscriptionModal } from "@/components/ui";
import { AvatarListModal } from "@/components/users/avatar-list-modal";
import { useAuth } from "@/hooks/use-auth";

interface AttendeeItem {
  id: string;
  avatar_url?: string | null;
  name: string;
  twitter_handle?: string;
  isVerified?: boolean;
}

interface AttendeesListProps {
  title: string;
  items: AttendeeItem[];
  showAllText?: string;
  showAllHref?: string;
  capacityInfo?: string;
  ctaButtonText?: string;
  ctaButtonHref?: string;
  emptyText?: string;
  maxVisible?: number;
  eventSlug?: string;
  isFriendsList?: boolean;
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
  eventSlug,
  isFriendsList = false,
}: AttendeesListProps) {
  const { user, isAuthenticated } = useAuth();
  const [showProModal, setShowProModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState("Log in or Sign up to continue");
  const [showListModal, setShowListModal] = useState(false);
  const [allItems, setAllItems] = useState<AttendeeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const visibleItems = items.slice(0, maxVisible);
  const remainingCount = items.length - maxVisible;
  const isShowAllAttendees = showAllText?.toLowerCase().includes("attendees");
  const isShowAllFriends = showAllText?.toLowerCase().includes("friends");
  const modalTitle = isShowAllFriends ? "Friends Going" : "All Attendees";
  const modalEmptyText = isShowAllFriends ? "No friends going" : "No attendees yet";

  const modalItems = useMemo(
    () =>
      allItems.map((item) => ({
        id: item.id,
        avatar_url: item.avatar_url,
        name: item.name,
        handle: item.twitter_handle,
      })),
    [allItems]
  );

  const handleShowAll = async () => {
    if (!isAuthenticated) {
      setAuthModalTitle(
        isFriendsList
          ? "Log in or Sign up to see friends going"
          : "Log in or Sign up to see attendee list"
      );
      setShowAuthModal(true);
      return;
    }

    if (!eventSlug) {
      setAllItems(items);
      setShowListModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isFriendsList ? `/api/events/${eventSlug}/friends` : `/api/events/${eventSlug}/attendees`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setAllItems(data.items || data.attendees || data.friends || items);
      } else {
        setAllItems(items);
      }
    } catch (error) {
      console.error("Error fetching full list:", error);
      setAllItems(items);
    } finally {
      setIsLoading(false);
      setShowListModal(true);
    }
  };

  const handleAvatarClick = (e: MouseEvent, twitterHandle?: string) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setAuthModalTitle("Log in or Sign up to view profiles");
      setShowAuthModal(true);
      return;
    }

    if (twitterHandle) {
      window.location.href = `/profile/${twitterHandle}`;
    }
  };

  return (
    <div className="space-y-2">
      {title && <p className="text-sm text-[var(--color-text-secondary)] mb-2">{title}</p>}

      {items.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2 mb-2">
            {visibleItems.map((item) => (
              <div key={item.id} onClick={(e) => handleAvatarClick(e, item.twitter_handle)} className="cursor-pointer">
                <Avatar
                  src={item.avatar_url}
                  alt={item.name}
                  size="sm"
                  isVerified={item.isVerified}
                />
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                +{remainingCount}
              </div>
            )}
          </div>

          {showAllText && (
            <div className="mb-2">
              {isShowAllAttendees || isShowAllFriends ? (
                <button
                  onClick={handleShowAll}
                  disabled={isLoading}
                  className="text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
                >
                  {isLoading ? "Loading..." : showAllText}
                </button>
              ) : (
                <Link href={showAllHref || "#"} className="text-xs text-[var(--color-primary)] hover:underline">
                  {showAllText}
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] mb-2">{emptyText}</p>
      )}

      {capacityInfo && <p className="text-xs text-[var(--color-text-muted)]">{capacityInfo}</p>}

      {ctaButtonText && ctaButtonHref && (
        <Button
          variant="outline"
          className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
          size="sm"
          asChild
        >
          <Link href={ctaButtonHref}>{ctaButtonText}</Link>
        </Button>
      )}

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        variant="compact"
        title={authModalTitle}
      />

      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description={`Viewing all ${isShowAllFriends ? "friends" : "event attendees"} is available only with PRO subscription. Upgrade to PRO to unlock this feature.`}
      />

      <AvatarListModal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        title={modalTitle}
        ariaLabel={modalTitle}
        items={modalItems}
        emptyText={modalEmptyText}
        getHref={(item) => (item.handle ? `/profile/${item.handle}` : "#")}
      />
    </div>
  );
}
