"use client";

import { useState } from "react";
import { Avatar, Button, ProSubscriptionModal, AuthRequiredModal, Modal, ModalHeader, ModalTitle, ModalContent } from "@/components/ui";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";

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
  eventSlug?: string; // Slug события для загрузки полного списка
  isFriendsList?: boolean; // true если это список друзей, false если участников
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
  const isVip = user?.subscription_tier === "vip";
  const [showProModal, setShowProModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [allItems, setAllItems] = useState<AttendeeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const visibleItems = items.slice(0, maxVisible);
  const remainingCount = items.length - maxVisible;
  
  // Проверяем, является ли это "Show all attendees" или "Show all friends"
  const isShowAllAttendees = showAllText?.toLowerCase().includes("attendees");
  const isShowAllFriends = showAllText?.toLowerCase().includes("friends");

  const handleShowAll = async () => {
    // Если не авторизован - показываем модальное окно авторизации
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    // Если авторизован, но не VIP - показываем модальное окно подписки
    if (!isVip) {
      setShowProModal(true);
      return;
    }

    // Если VIP - загружаем полный список и показываем модальное окно
    if (eventSlug) {
      setIsLoading(true);
      try {
        const endpoint = isFriendsList 
          ? `/api/events/${eventSlug}/friends`
          : `/api/events/${eventSlug}/attendees`;
        
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          setAllItems(data.items || data.attendees || data.friends || items);
        } else {
          // Если ошибка, используем уже имеющиеся данные
          setAllItems(items);
        }
      } catch (error) {
        console.error("Error fetching full list:", error);
        // При ошибке используем уже имеющиеся данные
        setAllItems(items);
      } finally {
        setIsLoading(false);
        setShowListModal(true);
      }
    } else {
      // Если нет eventSlug, используем уже имеющиеся данные
      setAllItems(items);
      setShowListModal(true);
    }
  };

  // Обработчик клика по аватару пользователя
  const handleAvatarClick = (e: React.MouseEvent, twitterHandle?: string) => {
    e.preventDefault();
    
    // Проверяем авторизацию
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    // Проверяем VIP статус
    if (!isVip) {
      setShowProModal(true);
      return;
    }

    // Если авторизован и VIP - разрешаем переход
    if (twitterHandle) {
      window.location.href = `/profile/${twitterHandle}`;
    }
  };

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
              <div
                key={item.id}
                onClick={(e) => handleAvatarClick(e, item.twitter_handle)}
                className="cursor-pointer"
              >
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
              {(isShowAllAttendees || isShowAllFriends) ? (
                <button
                  onClick={handleShowAll}
                  disabled={isLoading}
                  className="text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
                >
                  {isLoading ? "Loading..." : showAllText}
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

      {/* Auth Required Modal */}
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in required"
        description="Please sign up or log in to view the full list."
      />

      {/* Pro Subscription Modal */}
      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description={`Viewing all ${isShowAllFriends ? "friends" : "event attendees"} is available only with PRO subscription. Upgrade to PRO to unlock this feature.`}
      />

      {/* List Modal */}
      <Modal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        size="md"
        ariaLabel={isShowAllFriends ? "Friends list" : "Attendees list"}
      >
        <ModalHeader>
          <ModalTitle>{isShowAllFriends ? "Friends Going" : "All Attendees"}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {allItems.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                {isShowAllFriends ? "No friends going" : "No attendees yet"}
              </p>
            ) : (
              allItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.twitter_handle ? `/profile/${item.twitter_handle}` : "#"}
                  onClick={() => setShowListModal(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.avatar_url ? (
                      <Image
                        src={item.avatar_url}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {item.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {item.name}
                    </p>
                    {item.twitter_handle && (
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">
                        @{item.twitter_handle}
                      </p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}

