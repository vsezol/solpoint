"use client";

import { useState } from "react";
import { Avatar, Button, ProSubscriptionModal, AuthRequiredModal, Modal, ModalHeader, ModalTitle, ModalContent } from "@/components/ui";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";

interface MemberItem {
  id: string;
  avatar_url?: string | null;
  name: string;
  twitter_handle?: string;
  isVip?: boolean;
  isVerified?: boolean;
}

interface MembersListProps {
  title: string; // Например: "13 people are members" или "3 frens are members"
  items: MemberItem[];
  showAllText?: string; // Например: "Show all members" или "Show all frens"
  showAllHref?: string; // URL для "Show all" (вместо onShowAll для Server Components)
  emptyText?: string; // Текст когда список пуст
  maxVisible?: number; // Максимальное количество видимых аватаров (по умолчанию 3)
  entitySlug?: string; // Slug сущности для загрузки полного списка
  entityType?: "hub" | "community" | "project" | "workspace"; // Тип сущности
  isFriendsList?: boolean; // true если это список друзей, false если участников
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
  
  // Проверяем, является ли это "Show all members" или "Show all frens"
  const isShowAllMembers = showAllText?.toLowerCase().includes("members");
  const isShowAllFrens = showAllText?.toLowerCase().includes("frens") || showAllText?.toLowerCase().includes("friends");

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
    if (entitySlug && entityType) {
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
      // Если нет entitySlug, используем уже имеющиеся данные
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
              {(isShowAllMembers || isShowAllFrens) ? (
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
        description={`Viewing all ${isShowAllFrens ? "friends" : `${getEntityName()} members`} is available only with PRO subscription. Upgrade to PRO to unlock this feature.`}
      />

      {/* List Modal */}
      <Modal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        size="md"
        ariaLabel={isShowAllFrens ? "Friends list" : "Members list"}
      >
        <ModalHeader>
          <ModalTitle>{isShowAllFrens ? "Friends" : "All Members"}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {allItems.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                {isShowAllFrens ? "No friends" : "No members yet"}
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


