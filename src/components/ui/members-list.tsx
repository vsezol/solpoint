"use client";

import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { Avatar, AuthRequiredModal, ProSubscriptionModal } from "@/components/ui";
import { AvatarListModal } from "@/components/users/avatar-list-modal";
import { useAuth } from "@/hooks/use-auth";

interface MemberItem {
  id: string;
  avatar_url?: string | null;
  name: string;
  twitter_handle?: string;
  isVip?: boolean;
  isVerified?: boolean;
}

interface MembersListProps {
  title: string;
  items: MemberItem[];
  showAllText?: string;
  showAllHref?: string;
  emptyText?: string;
  maxVisible?: number;
  entitySlug?: string;
  entityType?: "hub" | "community" | "project" | "workspace";
  isFriendsList?: boolean;
}

export function MembersList({
  title,
  items,
  showAllText,
  showAllHref,
  emptyText = "No members yet",
  maxVisible = 3,
  entitySlug,
  entityType,
  isFriendsList = false,
}: MembersListProps) {
  const { user, isAuthenticated } = useAuth();
  const isVip = user?.subscription_tier === "vip";
  const [showProModal, setShowProModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [allItems, setAllItems] = useState<MemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const visibleItems = items.slice(0, maxVisible);
  const remainingCount = items.length - maxVisible;
  const isShowAllMembers = showAllText?.toLowerCase().includes("members");
  const isShowAllFrens = showAllText?.toLowerCase().includes("frens") || showAllText?.toLowerCase().includes("friends");

  const modalTitle = isShowAllFrens ? "Friends" : "All Members";
  const modalEmptyText = isShowAllFrens ? "No friends" : "No members yet";

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

  const getEntityName = () => {
    switch (entityType) {
      case "hub":
        return "hub";
      case "community":
        return "community";
      case "project":
        return "project";
      case "workspace":
        return "workspace";
      default:
        return "entity";
    }
  };

  const handleShowAll = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!isVip) {
      setShowProModal(true);
      return;
    }

    if (!entitySlug || !entityType) {
      setAllItems(items);
      setShowListModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isFriendsList
        ? `/api/${entityType}s/${entitySlug}/friends`
        : `/api/${entityType}s/${entitySlug}/members`;
      const response = await fetch(endpoint);

      if (response.ok) {
        const data = await response.json();
        setAllItems(data.items || data.members || data.friends || items);
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
      setShowAuthModal(true);
      return;
    }

    if (!isVip) {
      setShowProModal(true);
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
                  isVip={item.isVip}
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
              {isShowAllMembers || isShowAllFrens ? (
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

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in required"
        description="Please sign up or log in to view the full list."
      />

      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description={`Viewing all ${isShowAllFrens ? "friends" : `${getEntityName()} members`} is available only with PRO subscription. Upgrade to PRO to unlock this feature.`}
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
