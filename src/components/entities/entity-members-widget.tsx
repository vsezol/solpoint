"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Avatar, ProSubscriptionModal, AuthRequiredModal, Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, ModalFooter, Button, UserListItem } from "@/components/ui";
import { UserListModal } from "@/components/users/user-list-modal";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Twitter, Linkedin, Instagram, Facebook, Globe } from "lucide-react";
import type { ExternalUser } from "@/types";
import type { DirectoryUser, FriendshipStatus } from "@/types/profile";
import {
  addFriend,
  getFriendStatuses,
  mapFollowStatusesToFriendshipStatuses,
} from "@/lib/api/friends";
import { isMeetingRequestsEnabled } from "@/lib/meeting-requests";
import { trackEvent } from "@/lib/analytics";
import { MeetingRequestForm } from "@/components/meeting-request-form";

const EXTERNAL_SOCIAL_ICONS: Record<string, { Icon: React.ComponentType<{ className?: string; size?: number }>; label: string }> = {
  twitter: { Icon: Twitter, label: "Twitter" },
  linkedin: { Icon: Linkedin, label: "LinkedIn" },
  instagram: { Icon: Instagram, label: "Instagram" },
  facebook: { Icon: Facebook, label: "Facebook" },
  website: { Icon: Globe, label: "Website" },
};

type EntityType = "hub" | "community" | "project" | "workspace" | "event";

type Member = DirectoryUser;

interface EntityMembersWidgetProps {
  entityType: EntityType;
  entityId: string; // UUID of the entity
  className?: string;
  eventStartAt?: string | null;
  eventTimezone?: string | null;
  eventLatitude?: number | null;
  eventLongitude?: number | null;
  /** When entityType is "event": whether the current user is registered (going) for this event */
  isUserRegistered?: boolean;
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
  eventStartAt = null,
  eventTimezone = null,
  eventLatitude = null,
  eventLongitude = null,
  isUserRegistered = true,
}: EntityMembersWidgetProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const isVip = user?.subscription_tier === "vip";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    totalMembers: number;
    totalFriends: number;
    members: Member[];
    friends: Member[];
    team: Member[];
    external?: ExternalUser[];
  } | null>(null);

  const [showProModal, setShowProModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [allFriends, setAllFriends] = useState<Member[]>([]);
  const [allExternal, setAllExternal] = useState<ExternalUser[]>([]);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, FriendshipStatus>>({});
  const [sendingFriendRequest, setSendingFriendRequest] = useState<Record<string, boolean>>({});
  const [creatingChat] = useState<Record<string, boolean>>({});
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingTarget, setMeetingTarget] = useState<Member | null>(null);
  const [showAttendRequiredModal, setShowAttendRequiredModal] = useState(false);
  const [attendRequiredTarget, setAttendRequiredTarget] = useState<Member | null>(null);
  const [attendLoading, setAttendLoading] = useState(false);
  const [attendError, setAttendError] = useState<string | null>(null);

  const texts = ENTITY_TEXTS[entityType];
  const meetingRequestsEnabled = isMeetingRequestsEnabled();

  // Функция загрузки данных
  const loadData = useCallback(async () => {
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
  }, [entityType, entityId]);

  // Загружаем данные при монтировании
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Слушаем событие обновления участников события
  useEffect(() => {
    if (entityType !== "event") return;

    const handleMemberUpdate = () => {
      // Обновляем данные при обновлении участников события
      loadData();
    };

    window.addEventListener("event-member-updated", handleMemberUpdate);

    return () => {
      window.removeEventListener("event-member-updated", handleMemberUpdate);
    };
  }, [entityType, loadData]);

  // Открываем модальное окно с уже загруженными данными
  const loadFullList = async (isFriends: boolean) => {
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

    // Используем уже загруженные данные, без дополнительного запроса
    if (isFriends) {
      setAllFriends(data?.friends || []);
      setShowFriendsModal(true);
    } else {
      setAllMembers(data?.members || []);
      setAllExternal(data?.external || []);
      setShowMembersModal(true);
    }
  };

  // Загружаем статусы дружбы для пользователей в модальном окне
  useEffect(() => {
    if (!(showMembersModal || showFriendsModal) || !isAuthenticated || !user) {
      return;
    }

    const userIds = showMembersModal ? allMembers.map((m) => m.id) : allFriends.map((f) => f.id);
    if (userIds.length === 0) {
      setFriendStatuses({});
      return;
    }

    getFriendStatuses(userIds)
      .then(({ statuses }) => {
        setFriendStatuses(mapFollowStatusesToFriendshipStatuses(statuses));
      })
      .catch((error) => {
        console.error("Error fetching friend statuses:", error);
        const fallback = userIds.reduce<Record<string, FriendshipStatus>>((acc, userId) => {
          acc[userId] = "none";
          return acc;
        }, {});
        setFriendStatuses(fallback);
      });
  }, [showMembersModal, showFriendsModal, allMembers, allFriends, isAuthenticated, user]);

  // Отправка запроса на добавление в друзья
  const handleAddFriend = async (userId: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setSendingFriendRequest((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await addFriend(userId);
      setFriendStatuses((prev) => ({ ...prev, [userId]: response.status }));
    } catch (error) {
      console.error("Error adding friend:", error);
    } finally {
      setSendingFriendRequest((prev) => ({ ...prev, [userId]: false }));
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

  const handleOpenMeetingRequest = (userId: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!isVip) {
      setShowProModal(true);
      return;
    }

    const target = allMembers.find((member) => member.id === userId) || data?.members?.find((member) => member.id === userId) || null;
    if (!target) return;

    if (entityType === "event" && !isUserRegistered) {
      setAttendRequiredTarget(target);
      setShowMembersModal(false);
      setShowAttendRequiredModal(true);
      setAttendError(null);
      return;
    }

    setMeetingTarget(target);
    setIsMeetingModalOpen(true);
  };

  const handleAttendForMeeting = async () => {
    setAttendLoading(true);
    setAttendError(null);
    try {
      const response = await fetch(`/api/events/${entityId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "going" }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to attend event");
      }
      setShowAttendRequiredModal(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("event-member-updated", { detail: { eventSlug: entityId } }));
      }
      router.refresh();
      const target = attendRequiredTarget;
      setAttendRequiredTarget(null);
      if (target) {
        setMeetingTarget(target);
        setIsMeetingModalOpen(true);
      }
    } catch (err) {
      setAttendError(err instanceof Error ? err.message : "Failed to attend event");
    } finally {
      setAttendLoading(false);
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

  // Показываем всех участников и друзей (без ограничений)
  const visibleMembers = data.members || [];
  const visibleFriends = data.friends || [];
  const externalCount = data.external?.length ?? 0;
  const isEvent = entityType === "event";

  return (
    <>
      <Card variant="bordered" className={className}>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          {texts.membersLabel}
        </h3>
        <div className="space-y-6">
          {/* All Members */}
          {data.totalMembers > 0 || (isEvent && externalCount > 0) ? (
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                {data.totalMembers > 0 && texts.membersText(data.totalMembers)}
                {isEvent && externalCount > 0 && (
                  data.totalMembers > 0 ? ` · ${externalCount} external` : `${externalCount} external ${externalCount === 1 ? "attendee" : "attendees"}`
                )}
              </p>
              {(visibleMembers.length > 0 || (isEvent && externalCount > 0)) ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {visibleMembers.map((member) => (
                      <div
                        key={member.id}
                        onClick={(e) => handleAvatarClick(e, member.twitter_handle)}
                        className="cursor-pointer"
                      >
                        <Avatar
                          src={member.avatar_url}
                          alt={member.name}
                          size="sm"
                          isVip={member.isVip}
                          isVerified={member.isVerified}
                        />
                      </div>
                    ))}
                    {isEvent && (data.external || []).slice(0, 5).map((ext) => (
                      <a
                        key={ext.id}
                        href={ext.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <Avatar
                          src={ext.avatar ?? undefined}
                          alt={ext.name ?? "Attendee"}
                          size="sm"
                        />
                      </a>
                    ))}
                  </div>
                  <button
                    onClick={() => loadFullList(false)}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    {texts.showAllMembers}
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
                      <div
                        key={friend.id}
                        onClick={(e) => handleAvatarClick(e, friend.twitter_handle)}
                        className="cursor-pointer"
                      >
                        <Avatar
                          src={friend.avatar_url}
                          alt={friend.name}
                          size="sm"
                          isVip={friend.isVip}
                          isVerified={friend.isVerified}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => loadFullList(true)}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    {texts.showAllFriends}
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

      {/* Attend required to book meeting (event, user not registered) */}
      {isEvent && (
        <Modal
          isOpen={showAttendRequiredModal}
          onClose={() => {
            if (!attendLoading) {
              setShowAttendRequiredModal(false);
              setAttendRequiredTarget(null);
              setAttendError(null);
              setShowMembersModal(true);
            }
          }}
          size="md"
          ariaLabel="Attend event to book meeting"
        >
          <ModalHeader>
            <ModalTitle>Attend the event first</ModalTitle>
            <ModalDescription>
              To book a meeting you need to attend this event. Click Attend below to register, then you can send a meeting request.
            </ModalDescription>
          </ModalHeader>
          <ModalContent>
            {attendError && (
              <p className="text-sm text-red-500 mt-2">{attendError}</p>
            )}
          </ModalContent>
          <ModalFooter>
            <Button
              variant="primary"
              onClick={handleAttendForMeeting}
              disabled={attendLoading}
              isLoading={attendLoading}
            >
              Attend
            </Button>
          </ModalFooter>
        </Modal>
      )}

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
          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Internal (SolPoint) */}
            <div>
              {isEvent && allMembers.length > 0 && (
                <h4 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">Internal (SolPoint)</h4>
              )}
              {allMembers.length === 0 && allExternal.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                  {texts.emptyMembers}
                </p>
              ) : (
                <div className="space-y-3">
                  {allMembers.map((member) => {
                    const friendStatus = friendStatuses[member.id] || "none";
                    return (
                      <UserListItem
                        key={member.id}
                        member={member}
                        friendStatus={friendStatus}
                        onAddFriend={handleAddFriend}
                        sendingFriendRequest={sendingFriendRequest[member.id]}
                        creatingChat={creatingChat[member.id]}
                        onRequestMeeting={entityType === "event" && meetingRequestsEnabled ? handleOpenMeetingRequest : undefined}
                        showMeetingRequestButton={entityType === "event" && meetingRequestsEnabled}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            {/* External (e.g. Luma) - only for events */}
            {isEvent && allExternal.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">External</h4>
                <div className="space-y-3">
                  {allExternal.map((ext) => {
                    const socialEntries = ext.social_links
                      ? Object.entries(ext.social_links).filter(([, url]) => url && String(url).trim())
                      : [];
                    return (
                      <div
                        key={ext.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                      >
                        <a
                          href={ext.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 min-w-0 flex-1"
                        >
                          <Avatar
                            src={ext.avatar ?? undefined}
                            alt={ext.name ?? "Attendee"}
                            size="md"
                          />
                          <span className="text-[var(--color-text-primary)] font-medium truncate">
                            {ext.name ?? "Attendee"}
                          </span>
                        </a>
                        {socialEntries.length > 0 && (
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {socialEntries.map(([key, url]) => {
                              const config = EXTERNAL_SOCIAL_ICONS[key.toLowerCase()];
                              const Icon = config?.Icon ?? Globe;
                              const label = config?.label ?? key;
                              return (
                                <a
                                  key={key}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors"
                                  title={label}
                                  aria-label={label}
                                >
                                  <Icon className="w-4 h-4" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ModalContent>
      </Modal>

      {meetingTarget && (
        <MeetingRequestForm
          isOpen={isMeetingModalOpen}
          onClose={() => {
            setIsMeetingModalOpen(false);
            setMeetingTarget(null);
          }}
          targetUser={{
            id: meetingTarget.id,
            name: meetingTarget.name || "user",
          }}
          eventId={entityId}
          eventContext={{
            eventStartAt,
            timezone: eventTimezone,
            latitude: eventLatitude,
            longitude: eventLongitude,
          }}
          onSuccess={({ eventId }) => {
            trackEvent("meeting_request_create", {
              event_category: "Meeting Requests",
              event_label: "create",
              event_id: eventId,
            });
            setIsMeetingModalOpen(false);
            setMeetingTarget(null);
          }}
        />
      )}

      <UserListModal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        title={texts.modalTitleFriends}
        ariaLabel={texts.modalTitleFriends}
        users={allFriends}
        emptyText={texts.emptyFriends}
        friendStatuses={friendStatuses}
        defaultFriendStatus="accepted"
        onAddFriend={handleAddFriend}
        sendingFriendRequest={sendingFriendRequest}
        creatingChat={creatingChat}
      />
    </>
  );
}
