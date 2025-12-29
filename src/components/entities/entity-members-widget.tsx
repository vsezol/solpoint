"use client";

import { useState, useEffect } from "react";
import { Card, Avatar, Button, ProSubscriptionModal, AuthRequiredModal, Modal, ModalHeader, ModalTitle, ModalContent } from "@/components/ui";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import Image from "next/image";
import { MessageCircle, UserPlus, ExternalLink } from "lucide-react";

type EntityType = "hub" | "community" | "project" | "workspace" | "event";

interface Member {
  id: string;
  avatar_url?: string | null;
  name: string;
  twitter_handle?: string;
  isVip?: boolean;
  isVerified?: boolean;
  isOwner?: boolean;
  joinedAt?: string;
}

interface EntityMembersWidgetProps {
  entityType: EntityType;
  entityId: string; // UUID of the entity
  className?: string;
}

// Тексты для разных типов сущностей
const ENTITY_TEXTS: Record<EntityType, {
  membersLabel: string;
  membersText: (count: number) => string;
  friendsText: (count: number) => string;
  showAllMembers: string;
  showAllFriends: string;
  emptyMembers: string;
  emptyFriends: string;
  modalTitleMembers: string;
  modalTitleFriends: string;
}> = {
  hub: {
    membersLabel: "Members on SolPoint",
    membersText: (count) => `${count} ${count === 1 ? "person" : "people"} are members of this hub`,
    friendsText: (count) => `${count} ${count === 1 ? "fren" : "frens"} are members of this hub`,
    showAllMembers: "Show all members",
    showAllFriends: "Show all frens",
    emptyMembers: "No members yet",
    emptyFriends: "No friends yet",
    modalTitleMembers: "All Members",
    modalTitleFriends: "Friends",
  },
  community: {
    membersLabel: "Members on SolPoint",
    membersText: (count) => `${count} ${count === 1 ? "person" : "people"} are members of this community`,
    friendsText: (count) => `${count} ${count === 1 ? "fren" : "frens"} are members of this community`,
    showAllMembers: "Show all members",
    showAllFriends: "Show all frens",
    emptyMembers: "No members yet",
    emptyFriends: "No friends yet",
    modalTitleMembers: "All Members",
    modalTitleFriends: "Friends",
  },
  project: {
    membersLabel: "Members on SolPoint",
    membersText: (count) => `${count} ${count === 1 ? "person" : "people"} are working on this project`,
    friendsText: (count) => `${count} ${count === 1 ? "fren" : "frens"} are working on this project`,
    showAllMembers: "Show all members",
    showAllFriends: "Show all frens",
    emptyMembers: "No members yet",
    emptyFriends: "No friends yet",
    modalTitleMembers: "All Members",
    modalTitleFriends: "Friends",
  },
  workspace: {
    membersLabel: "Members on SolPoint",
    membersText: (count) => `${count} ${count === 1 ? "person" : "people"} are connected to this workspace`,
    friendsText: (count) => `${count} ${count === 1 ? "fren" : "frens"} are connected to this workspace`,
    showAllMembers: "Show all members",
    showAllFriends: "Show all frens",
    emptyMembers: "No members yet",
    emptyFriends: "No friends yet",
    modalTitleMembers: "All Members",
    modalTitleFriends: "Friends",
  },
  event: {
    membersLabel: "Attendees on SolPoint",
    membersText: (count) => `${count} ${count === 1 ? "person" : "people"} are attending this event`,
    friendsText: (count) => `${count} ${count === 1 ? "fren" : "frens"} are attending this event`,
    showAllMembers: "Show all attendees",
    showAllFriends: "Show all frens",
    emptyMembers: "No attendees yet",
    emptyFriends: "No friends yet",
    modalTitleMembers: "All Attendees",
    modalTitleFriends: "Friends",
  },
};

export function EntityMembersWidget({
  entityType,
  entityId,
  className,
}: EntityMembersWidgetProps) {
  const { user, isAuthenticated } = useAuth();
  const isVip = user?.subscription_tier === "vip";
  const { openChat } = useChat();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    totalMembers: number;
    totalFriends: number;
    members: Member[];
    friends: Member[];
    team: Member[];
  } | null>(null);

  const [showProModal, setShowProModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [allFriends, setAllFriends] = useState<Member[]>([]);
  const [loadingFullList, setLoadingFullList] = useState(false);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, "none" | "pending_sent" | "pending_received" | "accepted" | "blocked">>({});
  const [sendingFriendRequest, setSendingFriendRequest] = useState<Record<string, boolean>>({});
  const [creatingChat, setCreatingChat] = useState<Record<string, boolean>>({});

  const texts = ENTITY_TEXTS[entityType];

  // Загружаем данные при монтировании
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const url = `/api/members?entityType=${entityType}&entityId=${entityId}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `Failed to load members: ${response.status}`);
        }

        const result = await response.json();
        console.log(`[EntityMembersWidget] Received data for ${entityType}:`, {
          totalMembers: result.totalMembers,
          totalFriends: result.totalFriends,
          membersCount: result.members?.length || 0,
          friendsCount: result.friends?.length || 0,
          teamCount: result.team?.length || 0,
          sampleMember: result.members?.[0] || null,
          fullData: result,
        });
        setData(result);
      } catch (err) {
        console.error("Error loading members:", err);
        setError(err instanceof Error ? err.message : "Failed to load members");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [entityType, entityId]);

  // Загружаем полный список участников/друзей
  const loadFullList = async (isFriends: boolean) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!isVip) {
      setShowProModal(true);
      return;
    }

    setLoadingFullList(true);
    try {
      // Используем правильные endpoints в зависимости от типа сущности
      let endpoint: string;
      if (isFriends) {
        endpoint = `/api/${entityType}s/${entityId}/friends`;
      } else {
        if (entityType === "event") {
          endpoint = `/api/events/${entityId}/attendees`;
        } else {
          endpoint = `/api/${entityType}s/${entityId}/members`;
        }
      }

      const response = await fetch(endpoint);
      if (response.ok) {
        const result = await response.json();
        const items = result.items || result.members || result.friends || [];
        if (isFriends) {
          setAllFriends(items);
          setShowFriendsModal(true);
        } else {
          setAllMembers(items);
          setShowMembersModal(true);
        }
      } else {
        // Если ошибка, используем уже имеющиеся данные
        if (isFriends) {
          setAllFriends(data?.friends || []);
          setShowFriendsModal(true);
        } else {
          setAllMembers(data?.members || []);
          setShowMembersModal(true);
        }
      }
    } catch (error) {
      console.error("Error fetching full list:", error);
      // При ошибке используем уже имеющиеся данные
      if (isFriends) {
        setAllFriends(data?.friends || []);
        setShowFriendsModal(true);
      } else {
        setAllMembers(data?.members || []);
        setShowMembersModal(true);
      }
    } finally {
      setLoadingFullList(false);
    }
  };

  // Загружаем статусы дружбы для пользователей в модальном окне
  useEffect(() => {
    if ((showMembersModal || showFriendsModal) && isAuthenticated && user) {
      const userIds = showMembersModal
        ? allMembers.map((m) => m.id)
        : allFriends.map((f) => f.id);

      Promise.all(
        userIds.map(async (userId) => {
          try {
            const response = await fetch(`/api/friends?user_id=${userId}`);
            if (response.ok) {
              const result = await response.json();
              return { userId, status: result.data?.status || "none" };
            }
          } catch (error) {
            console.error(`Error fetching friend status for ${userId}:`, error);
          }
          return { userId, status: "none" as const };
        })
      ).then((results) => {
        const statusMap: Record<string, "none" | "pending_sent" | "pending_received" | "accepted" | "blocked"> = {};
        results.forEach(({ userId, status }) => {
          statusMap[userId] = status;
        });
        setFriendStatuses(statusMap);
      });
    }
  }, [showMembersModal, showFriendsModal, allMembers, allFriends, isAuthenticated, user]);

  // Отправка запроса на добавление в друзья
  const handleAddFriend = async (userId: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setSendingFriendRequest((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_id: userId }),
      });

      if (response.ok) {
        // Обновляем статус
        setFriendStatuses((prev) => ({ ...prev, [userId]: "pending_sent" }));
      }
    } catch (error) {
      console.error("Error adding friend:", error);
    } finally {
      setSendingFriendRequest((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // Создание чата
  const handleSendMessage = async (userId: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setCreatingChat((prev) => ({ ...prev, [userId]: true }));
    try {
      await openChat(userId);
    } catch (error) {
      console.error("Error creating chat:", error);
    } finally {
      setCreatingChat((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (loading) {
    return (
      <Card variant="bordered" className={className}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[var(--color-surface-hover)] rounded w-1/2"></div>
          <div className="h-4 bg-[var(--color-surface-hover)] rounded w-3/4"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    // Показываем виджет даже при ошибке, но с сообщением
    return (
      <Card variant="bordered" className={className}>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          {texts.membersLabel}
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          {error}
        </p>
      </Card>
    );
  }

  if (!data) {
    console.log(`[EntityMembersWidget] No data available for ${entityType}`);
    return null; // Не показываем виджет если данных нет и нет ошибки
  }

  console.log(`[EntityMembersWidget] Rendering widget for ${entityType}:`, {
    totalMembers: data.totalMembers,
    totalFriends: data.totalFriends,
    membersArray: data.members,
    friendsArray: data.friends,
    membersLength: data.members?.length || 0,
    friendsLength: data.friends?.length || 0,
  });

  const visibleMembers = data.members?.slice(0, 3) || [];
  const remainingMembers = (data.members?.length || 0) - 3;
  const visibleFriends = data.friends?.slice(0, 3) || [];
  const remainingFriends = (data.friends?.length || 0) - 3;

  return (
    <>
      <Card variant="bordered" className={className}>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          {texts.membersLabel}
        </h3>
        <div className="space-y-6">
          {/* All Members */}
          {data.totalMembers > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                {texts.membersText(data.totalMembers)}
              </p>
              {visibleMembers.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {visibleMembers.map((member) => (
                      <Link
                        key={member.id}
                        href={member.twitter_handle ? `/profile/${member.twitter_handle}` : "#"}
                      >
                        <Avatar
                          src={member.avatar_url}
                          alt={member.name}
                          size="sm"
                          isVip={member.isVip}
                          isVerified={member.isVerified}
                        />
                      </Link>
                    ))}
                    {remainingMembers > 0 && (
                      <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                        +{remainingMembers}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => loadFullList(false)}
                    disabled={loadingFullList}
                    className="text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
                  >
                    {loadingFullList ? "Loading..." : texts.showAllMembers}
                  </button>
                </>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">{texts.emptyMembers}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">{texts.emptyMembers}</p>
          )}

          {/* Friends */}
          {isAuthenticated && (data.totalFriends > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                {texts.friendsText(data.totalFriends)}
              </p>
              {visibleFriends.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {visibleFriends.map((friend) => (
                      <Link
                        key={friend.id}
                        href={friend.twitter_handle ? `/profile/${friend.twitter_handle}` : "#"}
                      >
                        <Avatar
                          src={friend.avatar_url}
                          alt={friend.name}
                          size="sm"
                          isVip={friend.isVip}
                          isVerified={friend.isVerified}
                        />
                      </Link>
                    ))}
                    {remainingFriends > 0 && (
                      <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                        +{remainingFriends}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => loadFullList(true)}
                    disabled={loadingFullList}
                    className="text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
                  >
                    {loadingFullList ? "Loading..." : texts.showAllFriends}
                  </button>
                </>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">{texts.emptyFriends}</p>
              )}
            </div>
          ) : null)}
        </div>
      </Card>

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
        description={`Viewing all ${entityType} members is available only with PRO subscription. Upgrade to PRO to unlock this feature.`}
      />

      {/* Members Modal */}
      <Modal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        size="md"
        ariaLabel={texts.modalTitleMembers}
      >
        <ModalHeader>
          <ModalTitle>{texts.modalTitleMembers}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {allMembers.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                {texts.emptyMembers}
              </p>
            ) : (
              allMembers.map((member) => {
                const friendStatus = friendStatuses[member.id] || "none";
                const isOwnProfile = user?.id === member.id;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <Link
                      href={member.twitter_handle ? `/profile/${member.twitter_handle}` : "#"}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {member.avatar_url ? (
                          <Image
                            src={member.avatar_url}
                            alt={member.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                            {member.name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {member.name}
                        </p>
                        {member.twitter_handle && (
                          <p className="text-xs text-[var(--color-text-secondary)] truncate">
                            @{member.twitter_handle}
                          </p>
                        )}
                      </div>
                    </Link>
                    {isAuthenticated && !isOwnProfile && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendMessage(member.id)}
                          disabled={creatingChat[member.id]}
                          title="Send Message"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        {friendStatus === "none" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddFriend(member.id)}
                            disabled={sendingFriendRequest[member.id]}
                            title="Add Friend"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        )}
                        <Link
                          href={member.twitter_handle ? `/profile/${member.twitter_handle}` : "#"}
                          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                          title="View Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ModalContent>
      </Modal>

      {/* Friends Modal */}
      <Modal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        size="md"
        ariaLabel={texts.modalTitleFriends}
      >
        <ModalHeader>
          <ModalTitle>{texts.modalTitleFriends}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {allFriends.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                {texts.emptyFriends}
              </p>
            ) : (
              allFriends.map((friend) => {
                const isOwnProfile = user?.id === friend.id;

                return (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <Link
                      href={friend.twitter_handle ? `/profile/${friend.twitter_handle}` : "#"}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {friend.avatar_url ? (
                          <Image
                            src={friend.avatar_url}
                            alt={friend.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                            {friend.name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {friend.name}
                        </p>
                        {friend.twitter_handle && (
                          <p className="text-xs text-[var(--color-text-secondary)] truncate">
                            @{friend.twitter_handle}
                          </p>
                        )}
                      </div>
                    </Link>
                    {isAuthenticated && !isOwnProfile && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendMessage(friend.id)}
                          disabled={creatingChat[friend.id]}
                          title="Send Message"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Link
                          href={friend.twitter_handle ? `/profile/${friend.twitter_handle}` : "#"}
                          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                          title="View Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}

