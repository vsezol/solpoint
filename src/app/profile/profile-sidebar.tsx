"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, Button, Avatar } from "@/components/ui";
import { Modal, ModalHeader, ModalTitle, ModalContent, AuthRequiredModal, ProSubscriptionModal, UserListItem } from "@/components/ui";
import { UserPlus, Crown, Calendar, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAppUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import type { User, Event, Invite } from "@/types";

interface ProfileSidebarProps {
  user: User;
  upcomingEvents: Event[];
}

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

export function ProfileSidebar({ user, upcomingEvents }: ProfileSidebarProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const isVip = currentUser?.subscription_tier === "vip";
  const { openChat } = useChat();
  
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [usersInCountry, setUsersInCountry] = useState<number>(0);
  const [usersInCity, setUsersInCity] = useState<number>(0);
  const [mutualFollowers, setMutualFollowers] = useState<User[]>([]);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<Invite | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [isMutualsModalOpen, setIsMutualsModalOpen] = useState(false);
  const [isCheckingPro, setIsCheckingPro] = useState(false);
  
  // States for users list modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showTotalUsersModal, setShowTotalUsersModal] = useState(false);
  const [showCountryUsersModal, setShowCountryUsersModal] = useState(false);
  const [showCityUsersModal, setShowCityUsersModal] = useState(false);
  const [usersList, setUsersList] = useState<Member[]>([]);
  const [friendsList, setFriendsList] = useState<Member[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, "none" | "pending_sent" | "pending_received" | "accepted" | "blocked">>({});
  const [sendingFriendRequest, setSendingFriendRequest] = useState<Record<string, boolean>>({});
  const [creatingChat, setCreatingChat] = useState<Record<string, boolean>>({});
  
  const router = useRouter();

  useEffect(() => {
    fetchStatistics();
    fetchMutualFollowers();
    fetchUserInvites();
  }, [user]);

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (user.country_code) {
        params.append("country_code", user.country_code);
      }
      if (user.city) {
        params.append("city", user.city);
      }

      const response = await fetch(`/api/profile/stats?${params.toString()}`);
      
      if (!response.ok) {
        console.error("Failed to fetch statistics:", response.status);
        return;
      }

      const data = await response.json();
      setTotalUsers(data.total || 0);
      setUsersInCountry(data.inCountry || 0);
      setUsersInCity(data.inCity || 0);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const fetchMutualFollowers = async () => {
    try {
      const response = await fetch("/api/twitter/mutual-followers");
      
      if (!response.ok) {
        // Не показываем ошибку, просто не загружаем данные
        console.error("Failed to fetch mutual followers:", response.status);
        setMutualFollowers([]);
        return;
      }

      const data = await response.json();
      setMutualFollowers(data.mutualFollowers || []);
    } catch (error) {
      console.error("Error fetching mutual followers:", error);
      setMutualFollowers([]);
    }
  };

  const checkProSubscription = async (): Promise<boolean> => {
    try {
      setIsCheckingPro(true);
      const response = await fetch("/api/subscriptions/current");
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const hasActivePro = data.subscription !== null && data.subscription.status === "active";
      return hasActivePro;
    } catch (error) {
      console.error("Error checking PRO subscription:", error);
      return false;
    } finally {
      setIsCheckingPro(false);
    }
  };

  const handleShowMutualsList = async () => {
    const isPro = await checkProSubscription();
    
    if (!isPro) {
      // Показываем сообщение о необходимости PRO подписки
      const shouldGoToSubscription = confirm(
        "A PRO subscription is required to view the full list of mutual followers. Would you like to go to the subscription page?"
      );
      if (shouldGoToSubscription) {
        router.push("/subscription");
      }
      return;
    }

    // Открываем модальное окно со списком
    setIsMutualsModalOpen(true);
  };

  const fetchUserInvites = async () => {
    setIsLoadingInvite(true);
    try {
      const response = await fetch("/api/invites");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json().catch((err) => {
        console.error("Error parsing invites response:", err);
        return { data: [] };
      });

      if (data.data && data.data.length > 0) {
        const activeInvite = data.data.find((invite: Invite) => {
          const isNotExpired = !invite.expires_at || new Date(invite.expires_at) >= new Date();
          let isWithinMaxUses = true;
          if (invite.max_uses !== null && invite.max_uses !== undefined) {
            const usesCount = invite.uses_count || 0;
            isWithinMaxUses = usesCount < invite.max_uses;
          }
          return isNotExpired && isWithinMaxUses;
        });

        if (activeInvite) {
          setCurrentInvite(activeInvite);
        }
      }
    } catch (error) {
      console.error("Error fetching invites:", error);
      // Не показываем ошибку пользователю, просто не загружаем invites
    } finally {
      setIsLoadingInvite(false);
    }
  };

  const handleGenerateInvite = async (): Promise<Invite | null> => {
    setIsGeneratingInvite(true);
    setIsCopied(false);
    
    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json().catch((err) => {
        console.error("Error parsing invite response:", err);
        throw new Error("Failed to parse server response");
      });

      if (!data.data) {
        throw new Error("Invalid response from server");
      }

      setCurrentInvite(data.data);
      return data.data;
    } catch (error) {
      console.error("Error generating invite:", error);
      alert(error instanceof Error ? error.message : "Failed to generate invite");
      return null;
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInviteLink = async () => {
    let inviteToCopy = currentInvite;

    // Если invite нет, сначала генерируем его
    if (!inviteToCopy) {
      inviteToCopy = await handleGenerateInvite();
      if (!inviteToCopy) {
        return; // Ошибка при генерации
      }
    }

    // Копируем ссылку
    const appUrl = getAppUrl();
    const inviteLink = `${appUrl}/signup?invite=${inviteToCopy.code}`;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      alert("Failed to copy link to clipboard");
    }
  };

  // Load users list
  const loadUsersList = async (filterType: "all" | "country" | "city") => {
    // Check authentication
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    // Check VIP status
    if (!isVip) {
      setShowProModal(true);
      return;
    }

    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      params.append("filter", filterType);
      if (filterType === "country" && user.country_code) {
        params.append("country_code", user.country_code);
      } else if (filterType === "city" && user.city) {
        params.append("city", user.city);
      }

      const response = await fetch(`/api/users/list?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.status}`);
      }

      const result = await response.json();
      setUsersList(result.users || []);
      setFriendsList(result.friends || []);

      // Open appropriate modal
      if (filterType === "all") {
        setShowTotalUsersModal(true);
      } else if (filterType === "country") {
        setShowCountryUsersModal(true);
      } else if (filterType === "city") {
        setShowCityUsersModal(true);
      }
    } catch (error) {
      console.error("Error loading users list:", error);
      alert(error instanceof Error ? error.message : "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load friend statuses for users in modal
  useEffect(() => {
    if ((showTotalUsersModal || showCountryUsersModal || showCityUsersModal) && isAuthenticated && currentUser) {
      const userIds = usersList.map((u) => u.id);

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
  }, [showTotalUsersModal, showCountryUsersModal, showCityUsersModal, usersList, isAuthenticated, currentUser]);

  // Handle add friend
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
        setFriendStatuses((prev) => ({ ...prev, [userId]: "pending_sent" }));
      }
    } catch (error) {
      console.error("Error adding friend:", error);
    } finally {
      setSendingFriendRequest((prev) => ({ ...prev, [userId]: false }));
    }
  };


  const formatEventDate = (startDate: string, endDate?: string, timezone?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    const formatDate = (date: Date, includeTime = false) => {
      const dateStr = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      
      if (includeTime) {
        const timeStr = date.toLocaleTimeString("en-US", { 
          hour: "numeric", 
          minute: "2-digit", 
          hour12: false 
        });
        
        if (timezone) {
          // Simple timezone offset calculation
          const offset = date.getTimezoneOffset();
          const hours = Math.floor(Math.abs(offset) / 60);
          const sign = offset <= 0 ? "+" : "-";
          return `${dateStr}, ${timeStr} (GMT ${sign}${hours})`;
        }
        
        return `${dateStr}, ${timeStr}`;
      }
      
      return dateStr;
    };

    if (end && start.toDateString() !== end.toDateString()) {
      return `${formatDate(start)}-${formatDate(end)}`;
    }

    // For single date, include time if it's a specific time (not just date)
    const hasTime = start.getHours() !== 0 || start.getMinutes() !== 0;
    return formatDate(start, hasTime);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* SolPoint users */}
      <Card variant="bordered" className="w-full">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          SolPoint users
        </h3>
        <div className="space-y-3 mb-4">
          <div>
            <button
              onClick={() => loadUsersList("all")}
              disabled={loadingUsers}
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer w-full text-left"
            >
              Total users on SolPoint: <span className="text-[var(--color-text-primary)] font-medium">{totalUsers.toLocaleString()}</span>
            </button>
          </div>
          <div>
            <button
              onClick={() => loadUsersList("country")}
              disabled={loadingUsers}
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer w-full text-left"
            >
              Users in your country: <span className="text-[var(--color-text-primary)] font-medium">{usersInCountry.toLocaleString()}</span>
            </button>
          </div>
          <div>
            <button
              onClick={() => loadUsersList("city")}
              disabled={loadingUsers}
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer w-full text-left"
            >
              Users in your city: <span className="text-[var(--color-text-primary)] font-medium">{usersInCity.toLocaleString()}</span>
            </button>
          </div>
        </div>

        {/* Your mutuals */}
        <div className="mb-4 pt-4 border-t border-[var(--color-surface-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Your mutuals
          </h3>
          {mutualFollowers.length > 0 ? (
            <>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                <span className="text-[var(--color-text-primary)] font-medium">
                  {mutualFollowers.length}
                </span>{" "}
                {mutualFollowers.length === 1
                  ? "person you follow on Twitter is"
                  : "people you follow on Twitter are"}{" "}
                on SolPoint
              </p>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center -space-x-2">
                  {mutualFollowers.slice(0, 3).map((follower) => (
                    <Link
                      key={follower.id}
                      href={`/profile/${follower.twitter_handle}`}
                      className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden hover:z-10 transition-transform hover:scale-110"
                    >
                      {follower.avatar_url ? (
                        <Image
                          src={follower.avatar_url}
                          alt={follower.twitter_name}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                          {follower.twitter_name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
                {mutualFollowers.length > 3 && (
                  <button
                    onClick={handleShowMutualsList}
                    className="text-sm text-[var(--color-primary)] hover:underline ml-auto"
                    disabled={isCheckingPro}
                  >
                    Show list
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">
              <span className="text-[var(--color-text-primary)] font-medium">0</span> Mutuals
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-[var(--color-text-secondary)]">
              Invite friends
            </span>
            <Button
              onClick={handleCopyInviteLink}
              variant={isCopied ? "secondary" : "primary"}
              size="sm"
              className="whitespace-nowrap"
              isLoading={isLoadingInvite || isGeneratingInvite}
              disabled={isLoadingInvite || isGeneratingInvite}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Generate Invite Link
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* What's happening */}
      <Card variant="bordered" className="w-full">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          What&apos;s happening
        </h3>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.slice(0, 3).map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug || event.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {event.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {formatEventDate(event.start_date, event.end_date, event.timezone)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
            No upcoming events
          </p>
        )}
      </Card>

      {/* Upgrade to PRO */}
      {user.subscription_tier === "free" && (
        <Card variant="bordered" className="w-full bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Upgrade to PRO
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            See cities, profiles, send messages, and more
          </p>
          <Button asChild variant="primary" size="sm" className="w-full">
            <Link href="/subscription">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade
            </Link>
          </Button>
        </Card>
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
        description="Viewing all users is available only with PRO subscription. Upgrade to PRO to unlock this feature."
      />

      {/* Total Users Modal */}
      <Modal
        isOpen={showTotalUsersModal}
        onClose={() => setShowTotalUsersModal(false)}
        size="md"
        ariaLabel="All Users on SolPoint"
      >
        <ModalHeader>
          <ModalTitle>All Users on SolPoint</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {usersList.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                No users found
              </p>
            ) : (
              usersList.map((member) => {
                const friendStatus = friendStatuses[member.id] || "none";

                return (
                  <UserListItem
                    key={member.id}
                    member={member}
                    friendStatus={friendStatus}
                    onAddFriend={handleAddFriend}
                    sendingFriendRequest={sendingFriendRequest[member.id]}
                    creatingChat={creatingChat[member.id]}
                  />
                );
              })
            )}
          </div>
        </ModalContent>
      </Modal>

      {/* Country Users Modal */}
      <Modal
        isOpen={showCountryUsersModal}
        onClose={() => setShowCountryUsersModal(false)}
        size="md"
        ariaLabel="Users in your country"
      >
        <ModalHeader>
          <ModalTitle>Users in your country</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {usersList.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                No users found
              </p>
            ) : (
              usersList.map((member) => {
                const friendStatus = friendStatuses[member.id] || "none";

                return (
                  <UserListItem
                    key={member.id}
                    member={member}
                    friendStatus={friendStatus}
                    onAddFriend={handleAddFriend}
                    sendingFriendRequest={sendingFriendRequest[member.id]}
                    creatingChat={creatingChat[member.id]}
                  />
                );
              })
            )}
          </div>
        </ModalContent>
      </Modal>

      {/* City Users Modal */}
      <Modal
        isOpen={showCityUsersModal}
        onClose={() => setShowCityUsersModal(false)}
        size="md"
        ariaLabel="Users in your city"
      >
        <ModalHeader>
          <ModalTitle>Users in your city</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {usersList.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                No users found
              </p>
            ) : (
              usersList.map((member) => {
                const friendStatus = friendStatuses[member.id] || "none";

                return (
                  <UserListItem
                    key={member.id}
                    member={member}
                    friendStatus={friendStatus}
                    onAddFriend={handleAddFriend}
                    sendingFriendRequest={sendingFriendRequest[member.id]}
                    creatingChat={creatingChat[member.id]}
                  />
                );
              })
            )}
          </div>
        </ModalContent>
      </Modal>

      {/* Modal для списка mutuals */}
      <Modal
        isOpen={isMutualsModalOpen}
        onClose={() => setIsMutualsModalOpen(false)}
        size="md"
        ariaLabel="Mutual followers list"
      >
        <ModalHeader>
          <ModalTitle>Your mutuals</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {mutualFollowers.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                No mutual followers
              </p>
            ) : (
              mutualFollowers.map((follower) => (
                <Link
                  key={follower.id}
                  href={`/profile/${follower.twitter_handle}`}
                  onClick={() => setIsMutualsModalOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {follower.avatar_url ? (
                      <Image
                        src={follower.avatar_url}
                        alt={follower.twitter_name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {follower.twitter_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {follower.twitter_name}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">
                      @{follower.twitter_handle}
                    </p>
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

