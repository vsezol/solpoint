"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, Badge, Button, Avatar } from "@/components/ui";
import { 
  Twitter, 
  Instagram, 
  Facebook, 
  Wallet, 
  LogOut, 
  MapPin, 
  Users,
  Camera,
  UserPlus,
  Check,
  Copy,
  Calendar,
  Crown,
  Loader2,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User, Event, Invite } from "@/types";
import { getAppUrl } from "@/lib/utils";
import { ProfileEditForm } from "./profile-edit-form";
import { useProfileEdit } from "./profile-edit-provider";
import { AddFriendButton } from "./add-friend-button";
import { EditProfileButton } from "./edit-profile-button";
import { trackEvent } from "@/lib/analytics";
import { Modal, ModalHeader, ModalTitle, ModalContent, ProSubscriptionModal, AuthRequiredModal } from "@/components/ui";
import { CreateEntityForm } from "@/components/hubs/create-entity-form";
import type { EntityType } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { MessageCircle, UserCheck } from "lucide-react";

interface ProfileContentProps {
  user: User;
  isOwnProfile: boolean;
}

export function ProfileContent({
  user,
  isOwnProfile,
}: ProfileContentProps) {
  const { isEditing, setIsEditing } = useProfileEdit();
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [isOpenToMeet, setIsOpenToMeet] = useState(user.is_open_to_meet);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<Invite | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [usersInCountry, setUsersInCountry] = useState<number>(0);
  const [usersInCity, setUsersInCity] = useState<number>(0);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [mutualFollowers, setMutualFollowers] = useState<User[]>([]);
  const [isMutualsModalOpen, setIsMutualsModalOpen] = useState(false);
  const [isCheckingPro, setIsCheckingPro] = useState(false);
  const [friendsStats, setFriendsStats] = useState({ friendsCount: 0, friendRequestsCount: 0 });
  const [friendshipStatus, setFriendshipStatus] = useState<"none" | "pending_sent" | "pending_received" | "accepted" | "blocked">("none");
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [isLoadingProfileData, setIsLoadingProfileData] = useState(true);
  const [affiliations, setAffiliations] = useState<Array<{
    id: string;
    name: string;
    slug: string | null;
    image_url: string | null;
    type: "hub" | "community" | "project" | "workspace" | "event";
    country?: string | null;
    city?: string | null;
    start_date?: string;
  }>>([]);
  const [isLoadingAffiliations, setIsLoadingAffiliations] = useState(true);
  const [isAffiliationsModalOpen, setIsAffiliationsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEntityType, setCreateEntityType] = useState<EntityType>("hub");
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isFriendRequestsModalOpen, setIsFriendRequestsModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [friendRequestsList, setFriendRequestsList] = useState<User[]>([]);
  const [showProModal, setShowProModal] = useState(false);
  const router = useRouter();
  const { user: currentAuthUser, isAuthenticated } = useAuth();
  const isVip = currentAuthUser?.subscription_tier === "vip";
  const { openChat } = useChat();

  // States for users list modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModalUsers, setShowProModalUsers] = useState(false);
  const [showTotalUsersModal, setShowTotalUsersModal] = useState(false);
  const [showCountryUsersModal, setShowCountryUsersModal] = useState(false);
  const [showCityUsersModal, setShowCityUsersModal] = useState(false);
  const [usersList, setUsersList] = useState<Array<{
    id: string;
    avatar_url?: string | null;
    name: string;
    twitter_handle?: string;
    isVip?: boolean;
    isVerified?: boolean;
    isOwner?: boolean;
    joinedAt?: string;
  }>>([]);
  const [friendsListUsers, setFriendsListUsers] = useState<typeof usersList>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, "none" | "pending_sent" | "pending_received" | "accepted" | "blocked">>({});
  const [sendingFriendRequest, setSendingFriendRequest] = useState<Record<string, boolean>>({});
  const [creatingChat, setCreatingChat] = useState<Record<string, boolean>>({});

  // Обновляем локальное состояние при изменении user prop
  useEffect(() => {
    setCurrentUser(user);
    setIsOpenToMeet(user.is_open_to_meet);
  }, [user]);

  // Загружаем данные профиля (events, friendsCount, friendshipStatus, upcomingEvents)
  const fetchProfileData = async () => {
    setIsLoadingProfileData(true);
    try {
      const response = await fetch(`/api/profile/data?user_id=${user.id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPastEvents(data.pastEvents || []);
      setFriendsCount(data.friendsCount || 0);
      setFriendshipStatus(data.friendshipStatus || "none");
      setUpcomingEvents(data.upcomingEvents || []);
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setIsLoadingProfileData(false);
    }
  };

  // Загружаем статистику и invites параллельно
  useEffect(() => {
    const loadData = async () => {
      const promises: Promise<void>[] = [
        fetchProfileData(),
        fetchStatistics(),
        fetchAffiliations()
      ];

      if (isOwnProfile) {
        promises.push(
          fetchUserInvites(),
          fetchMutualFollowers(),
          fetchFriendsStats()
        );
      }

      await Promise.allSettled(promises);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, isOwnProfile]);

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (user.country_code) {
        params.append("country_code", user.country_code);
      }
      if (user.city) {
        params.append("city", user.city);
      }

      const response = await fetch(`/api/profile/stats?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTotalUsers(data.total || 0);
      setUsersInCountry(data.inCountry || 0);
      setUsersInCity(data.inCity || 0);
    } catch (error) {
      console.error("Error fetching statistics:", error);
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
      setShowProModalUsers(true);
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
      setFriendsListUsers(result.friends || []);

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
    if ((showTotalUsersModal || showCountryUsersModal || showCityUsersModal) && isAuthenticated && currentAuthUser) {
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
  }, [showTotalUsersModal, showCountryUsersModal, showCityUsersModal, usersList, isAuthenticated, currentAuthUser]);

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

  // Handle send message
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

  const fetchFriendsStats = async () => {
    try {
      const response = await fetch("/api/friends/stats");
      
      if (!response.ok) {
        console.error("Failed to fetch friends stats:", response.status);
        return;
      }

      const data = await response.json();
      setFriendsStats({
        friendsCount: data.friendsCount || 0,
        friendRequestsCount: data.friendRequestsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching friends stats:", error);
    }
  };

  const fetchAffiliations = async () => {
    setIsLoadingAffiliations(true);
    try {
      const url = isOwnProfile 
        ? "/api/profile/affiliations"
        : `/api/profile/affiliations?user_id=${user.id}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error("Failed to fetch affiliations:", response.status);
        setAffiliations([]);
        return;
      }

      const data = await response.json();
      setAffiliations(data.affiliations || []);
    } catch (error) {
      console.error("Error fetching affiliations:", error);
      setAffiliations([]);
    } finally {
      setIsLoadingAffiliations(false);
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
    if (!isVip) {
      setShowProModal(true);
      return;
    }

    // Открываем модальное окно со списком
    setIsMutualsModalOpen(true);
  };

  const handleShowAffiliationsList = async () => {
    // Проверяем подписку текущего пользователя (который смотрит профиль)
    if (!isVip) {
      setShowProModal(true);
      return;
    }
    // Если есть VIP подписка, открываем модальное окно со списком
    setIsAffiliationsModalOpen(true);
  };

  const handleUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setIsOpenToMeet(updatedUser.is_open_to_meet);
  };

  const handleAddEntityClick = () => {
    // Проверка авторизации не нужна, так как это доступно только для своего профиля
    // (isOwnProfile проверяется на уровне компонента)
    if (!isVip) {
      setShowProModal(true);
      return;
    }
    setCreateEntityType("hub");
    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = (entity: { id: string; slug: string; type: EntityType }) => {
    setIsCreateModalOpen(false);
    // Обновляем список affiliations после создания
    fetchAffiliations();
  };

  const handleShowFriendsList = async () => {
    try {
      const response = await fetch(`/api/friends/list?user_id=${user.id}&type=mutual`);
      if (response.ok) {
        const data = await response.json();
        setFriendsList(data.data || []);
        setIsFriendsModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching friends list:", error);
    }
  };

  const handleShowFriendRequestsList = async () => {
    try {
      const response = await fetch("/api/friends/requests");
      if (response.ok) {
        const data = await response.json();
        setFriendRequestsList(data.data || []);
        setIsFriendRequestsModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    }
  };

  const handleAcceptFriendRequest = async (friendId: string) => {
    try {
      const response = await fetch("/api/friends/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ friend_id: friendId }),
      });

      if (response.ok) {
        // Удаляем из списка заявок
        setFriendRequestsList((prev) => prev.filter((u) => u.id !== friendId));
        // Обновляем статистику
        fetchFriendsStats();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to accept friend request");
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
      alert("Failed to accept friend request");
    }
  };

  const handleDeclineFriendRequest = async (friendId: string) => {
    try {
      const response = await fetch(`/api/friends/requests?friend_id=${friendId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Удаляем из списка заявок
        setFriendRequestsList((prev) => prev.filter((u) => u.id !== friendId));
        // Обновляем статистику
        fetchFriendsStats();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to decline friend request");
      }
    } catch (error) {
      console.error("Error declining friend request:", error);
      alert("Failed to decline friend request");
    }
  };

  const handleToggleOpenToMeet = async () => {
    const newValue = !isOpenToMeet;
    setIsOpenToMeet(newValue);
    
    try {
      const response = await fetch("/api/profile/open-to-meet", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_open_to_meet: newValue }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const { profile } = await response.json();
      setCurrentUser({ ...currentUser, is_open_to_meet: newValue });
    } catch (error) {
      console.error("Error updating open to meet:", error);
      setIsOpenToMeet(!newValue);
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

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/profile/banner", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json().catch((err) => {
        console.error("Error parsing banner response:", err);
        throw new Error("Failed to parse server response");
      });

      if (!data.banner_url) {
        throw new Error("Invalid response from server");
      }

      // Обновляем локальное состояние
      setCurrentUser({ ...currentUser, banner_url: data.banner_url });
    } catch (error) {
      console.error("Error uploading banner:", error);
      alert(error instanceof Error ? error.message : "Failed to upload banner");
    } finally {
      setIsUploadingBanner(false);
      // Сбрасываем input для возможности повторной загрузки того же файла
      e.target.value = "";
    }
  };

  const handleBannerDelete = async () => {
    if (!confirm("Are you sure you want to remove your banner?")) {
      return;
    }

    setIsUploadingBanner(true);

    try {
      const response = await fetch("/api/profile/banner", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Проверяем ответ (может быть пустым)
      await response.json().catch(() => ({}));

      // Обновляем локальное состояние
      setCurrentUser({ ...currentUser, banner_url: undefined });
    } catch (error) {
      console.error("Error deleting banner:", error);
      alert(error instanceof Error ? error.message : "Failed to delete banner");
    } finally {
      setIsUploadingBanner(false);
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

    const hasTime = start.getHours() !== 0 || start.getMinutes() !== 0;
    return formatDate(start, hasTime);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Left column - Profile */}
      <div className="flex-1 min-w-0 max-w-[600px] w-full">
        <div className="flex flex-col gap-6">
          {/* Banner */}
          <div className="relative h-48 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl overflow-hidden">
            {currentUser.banner_url && (
              <Image
                src={currentUser.banner_url}
                alt="Profile banner"
                fill
                className="object-cover"
                unoptimized
              />
            )}
            {isOwnProfile && (
              <div className="absolute top-3 right-3 flex gap-2">
                <input
                  type="file"
                  id="banner-upload"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleBannerUpload}
                  disabled={isUploadingBanner}
                />
                <label
                  htmlFor="banner-upload"
                  className={`group p-2 rounded-lg bg-black/70 text-white border-white/30 backdrop-blur-md shadow-2xl hover:bg-black/90 hover:border-white/50 hover:scale-105 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] active:scale-100 transition-all duration-200 ${
                    isUploadingBanner ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                  style={{
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {isUploadingBanner ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
                  )}
                </label>
                {currentUser.banner_url && (
                  <button
                    onClick={handleBannerDelete}
                    disabled={isUploadingBanner}
                    className={`group p-2 rounded-lg bg-black/70 text-white border-white/30 backdrop-blur-md shadow-2xl hover:bg-black/90 hover:border-white/50 hover:scale-105 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] active:scale-100 transition-all duration-200 cursor-pointer ${
                      isUploadingBanner ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    style={{
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                    }}
                    title="Remove banner"
                  >
                    <svg
                      className="w-4 h-4 text-white transition-transform duration-200 group-hover:scale-110 group-hover:rotate-90"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Profile Header */}
          <div className="flex items-start justify-between -mt-20 relative z-10">
            <div className="ml-[18px] rounded-full overflow-hidden border-4 border-[var(--color-background)]">
              <Avatar
                src={currentUser.avatar_url}
                alt={currentUser.twitter_name}
                size="xl"
                isVip={currentUser.subscription_tier === "vip"}
                isVerified={currentUser.is_verified}
              />
            </div>
            {isOwnProfile ? (
              <div className="mr-[14px]">
                <EditProfileButton />
              </div>
            ) : (
              <div className="mr-[14px]">
                <AddFriendButton 
                  userId={user.id} 
                  userHandle={user.twitter_handle}
                  initialStatus={friendshipStatus} 
                />
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
                {currentUser.twitter_name}
              </h1>
              <p className="text-[var(--color-text-muted)]">
                @{currentUser.twitter_handle}
              </p>
            </div>

            {/* Role */}
            {currentUser.role && (
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <Users className="w-4 h-4" />
                <span className="capitalize">{currentUser.role}</span>
              </div>
            )}

            {/* Location */}
            {(currentUser.city || currentUser.country || (currentUser as User & { countries?: { name: string } })?.countries?.name) && (
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <MapPin className="w-4 h-4" />
                <span>
                  {currentUser.city && `${currentUser.city}, `}
                  {(currentUser as User & { countries?: { name: string } })?.countries?.name || currentUser.country || "Not specified"}
                </span>
              </div>
            )}

            {/* Bio */}
            {currentUser.bio && (
              <p className="text-[var(--color-text-secondary)]">
                {currentUser.bio}
              </p>
            )}

            {/* Friends count and requests */}
            {isOwnProfile ? (
              <div className="flex gap-[10px] items-center">
                <button
                  onClick={handleShowFriendsList}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                >
                  <span className="font-bold">{friendsStats.friendsCount}</span> {friendsStats.friendsCount === 1 ? "fren" : "frens"}
                </button>
                {friendsStats.friendRequestsCount > 0 && (
                  <button
                    onClick={handleShowFriendRequestsList}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                  >
                    <span className="font-bold">{friendsStats.friendRequestsCount}</span> fren {friendsStats.friendRequestsCount === 1 ? "request" : "requests"}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[var(--color-text-secondary)]">
                {friendsCount} {friendsCount === 1 ? "fren" : "frens"}
              </p>
            )}

            {/* Affiliations */}
            <div className="space-y-3">
              {isLoadingAffiliations ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="h-6 bg-[var(--color-surface-hover)] rounded w-32 animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] animate-pulse"
                        />
                      ))}
                    </div>
                    <div className="h-4 bg-[var(--color-surface-hover)] rounded w-16 ml-auto animate-pulse"></div>
                  </div>
                  {isOwnProfile && (
                    <div className="pt-4 border-t border-[var(--color-surface-border)]">
                      <div className="h-4 bg-[var(--color-surface-hover)] rounded w-40 mb-3 animate-pulse"></div>
                      <div className="h-9 bg-[var(--color-surface-hover)] rounded w-48 animate-pulse"></div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg text-[var(--color-text-primary)]">
                      <span className="font-bold">{affiliations.length}</span> <span className="text-[var(--color-text-secondary)] font-normal">Affiliations</span>
                    </h3>
                  </div>
                  {affiliations.length > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center -space-x-2">
                        {affiliations.slice(0, 3).map((affiliation) => (
                          <Link
                            key={affiliation.id}
                            href={
                              affiliation.type === "hub"
                                ? `/hubs/${affiliation.slug || affiliation.id}`
                                : affiliation.type === "community"
                                ? `/communities/${affiliation.slug || affiliation.id}`
                                : affiliation.type === "project"
                                ? `/projects/${affiliation.slug || affiliation.id}`
                                : affiliation.type === "event"
                                ? `/events/${affiliation.slug || affiliation.id}`
                                : `/profile/${user.twitter_handle}`
                            }
                            className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden hover:z-10 transition-transform hover:scale-110"
                          >
                            {affiliation.image_url ? (
                              <Image
                                src={affiliation.image_url}
                                alt={affiliation.name}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                {affiliation.name?.[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                      <button
                        onClick={handleShowAffiliationsList}
                        className="text-sm text-[var(--color-primary)] hover:underline ml-auto cursor-pointer"
                      >
                        Show list
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      No affiliations yet
                    </p>
                  )}
                  {isOwnProfile && (
                    <div className="pt-4 border-t border-[var(--color-surface-border)]">
                      <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                        Founder or organizer?
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-fit"
                        onClick={handleAddEntityClick}
                      >
                        Add your project to the map
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Edit Form or View */}
          {isEditing ? (
            <ProfileEditForm 
              user={currentUser} 
              onCancel={() => setIsEditing(false)}
              onUpdate={handleUpdate}
            />
          ) : (
            <>
              {/* {isOwnProfile && (
                <div className="w-fit">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-medium text-[var(--color-text-muted)]">
                      Wallet
                    </h3>
                    {currentUser.wallet_address ? (
                      <p className="text-sm font-mono text-[var(--color-text-secondary)] truncate max-w-[200px]">
                        {currentUser.wallet_address}
                      </p>
                    ) : (
                      <Button variant="outline" size="sm">
                        <Wallet className="w-4 h-4 mr-2" />
                        Connect wallet
                      </Button>
                    )}
                  </div>
                </div>
              )} */}

              {/* Socials */}
              <div className="w-fit">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm font-medium text-[var(--color-text-muted)]">
                    Socials
                  </h3>
                  <div className="flex gap-2">
                    <a
                      href={`https://twitter.com/${currentUser.twitter_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        trackEvent("profile_social_link_click", {
                          event_category: "Profiles",
                          event_label: currentUser.twitter_handle || currentUser.id,
                          target_user_id: currentUser.id,
                          social_platform: "twitter",
                        });
                      }}
                      className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                      aria-label="Twitter"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                    {currentUser.socials?.instagram && (
                      <a
                        href={currentUser.socials.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          trackEvent("profile_social_link_click", {
                            event_category: "Profiles",
                            event_label: currentUser.twitter_handle || currentUser.id,
                            target_user_id: currentUser.id,
                            social_platform: "instagram",
                          });
                        }}
                        className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        aria-label="Instagram"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {currentUser.socials?.facebook && (
                      <a
                        href={currentUser.socials.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          trackEvent("profile_social_link_click", {
                            event_category: "Profiles",
                            event_label: currentUser.twitter_handle || currentUser.id,
                            target_user_id: currentUser.id,
                            social_platform: "facebook",
                          });
                        }}
                        className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        aria-label="Facebook"
                      >
                        <Facebook className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Open to meet and Logout - только для своего профиля */}
              {isOwnProfile && (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      Open to meet:
                    </span>
                    <button
                      onClick={handleToggleOpenToMeet}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] ${
                        isOpenToMeet
                          ? "bg-green-500"
                          : "bg-[var(--color-surface-border)]"
                      }`}
                      aria-label={isOpenToMeet ? "Open to meet" : "Not open to meet"}
                      aria-checked={isOpenToMeet}
                      role="switch"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isOpenToMeet ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <form action="/api/auth/logout" method="POST">
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-surface-border)]"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Log out
                    </Button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right column - Sidebar */}
      <div className="w-full md:w-[557px] flex-shrink-0">
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
              {isOwnProfile && (
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
              )}
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
                        {formatEventDate(event.start_date, event.end_date, (event as Event & { timezone?: string }).timezone)}
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
        </div>
      </div>

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

      {/* Modal для списка affiliations */}
      <Modal
        isOpen={isAffiliationsModalOpen}
        onClose={() => setIsAffiliationsModalOpen(false)}
        size="md"
        ariaLabel="Affiliations list"
      >
        <ModalHeader>
          <ModalTitle>{isOwnProfile ? "Your Affiliations" : "Affiliations"}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          {isVip ? (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {affiliations.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                  No affiliations
                </p>
              ) : (
                affiliations.map((affiliation) => {
                  const href =
                    affiliation.type === "hub"
                      ? `/hubs/${affiliation.slug || affiliation.id}`
                      : affiliation.type === "community"
                      ? `/communities/${affiliation.slug || affiliation.id}`
                      : affiliation.type === "project"
                      ? `/projects/${affiliation.slug || affiliation.id}`
                      : affiliation.type === "event"
                      ? `/events/${affiliation.slug || affiliation.id}`
                      : `/profile/${user.twitter_handle}`;

                  return (
                    <Link
                      key={affiliation.id}
                      href={href}
                      onClick={() => setIsAffiliationsModalOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {affiliation.image_url ? (
                          <Image
                            src={affiliation.image_url}
                            alt={affiliation.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                            {affiliation.name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {affiliation.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)] truncate capitalize">
                          {affiliation.type}
                          {affiliation.city && ` • ${affiliation.city}`}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                A PRO subscription is required to view the full list of affiliations
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsAffiliationsModalOpen(false);
                  router.push("/subscription");
                }}
              >
                Get subscription
              </Button>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Create Entity Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="xl"
        variant="centered"
      >
        <ModalHeader>
          <ModalTitle>Create Hub, Community, Project, or Workspace</ModalTitle>
        </ModalHeader>
        <ModalContent>
          {/* Entity Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Select Type <span className="text-[var(--color-error)]">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setCreateEntityType("hub")}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  createEntityType === "hub"
                    ? "bg-[var(--color-primary)] text-[var(--color-background)] border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                Hub
              </button>
              <button
                type="button"
                onClick={() => setCreateEntityType("community")}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  createEntityType === "community"
                    ? "bg-[var(--color-primary)] text-[var(--color-background)] border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                Community
              </button>
              <button
                type="button"
                onClick={() => setCreateEntityType("project")}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  createEntityType === "project"
                    ? "bg-[var(--color-primary)] text-[var(--color-background)] border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                Project
              </button>
              <button
                type="button"
                onClick={() => setCreateEntityType("workspace")}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  createEntityType === "workspace"
                    ? "bg-[var(--color-primary)] text-[var(--color-background)] border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                Workspace
              </button>
            </div>
          </div>
          <CreateEntityForm
            entityType={createEntityType}
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </ModalContent>
      </Modal>

      {/* Modal для списка друзей */}
      <Modal
        isOpen={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
        size="md"
        ariaLabel="Friends list"
      >
        <ModalHeader>
          <ModalTitle>Your Friends</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {friendsList.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                No friends
              </p>
            ) : (
              friendsList.map((friend) => (
                <Link
                  key={friend.id}
                  href={`/profile/${friend.twitter_handle}`}
                  onClick={() => setIsFriendsModalOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {friend.avatar_url ? (
                      <Image
                        src={friend.avatar_url}
                        alt={friend.twitter_name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {friend.twitter_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {friend.twitter_name}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">
                      @{friend.twitter_handle}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </ModalContent>
      </Modal>

      {/* Modal для списка заявок в друзья */}
      <Modal
        isOpen={isFriendRequestsModalOpen}
        onClose={() => setIsFriendRequestsModalOpen(false)}
        size="md"
        ariaLabel="Friend requests list"
      >
        <ModalHeader>
          <ModalTitle>Friend Requests</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {friendRequestsList.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                No friend requests
              </p>
            ) : (
              friendRequestsList.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <Link
                    href={`/profile/${request.twitter_handle}`}
                    onClick={() => setIsFriendRequestsModalOpen(false)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {request.avatar_url ? (
                        <Image
                          src={request.avatar_url}
                          alt={request.twitter_name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                          {request.twitter_name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {request.twitter_name}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">
                        @{request.twitter_handle}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAcceptFriendRequest(request.id)}
                      className="whitespace-nowrap"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeclineFriendRequest(request.id)}
                      className="whitespace-nowrap"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ModalContent>
      </Modal>

      {/* Pro Subscription Modal */}
      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description="This feature is available only with PRO subscription. Upgrade to PRO to unlock this feature."
      />

      {/* Auth Required Modal */}
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in required"
        description="Please sign up or log in to view the full list."
      />

      {/* Pro Subscription Modal for Users List */}
      <ProSubscriptionModal
        isOpen={showProModalUsers}
        onClose={() => setShowProModalUsers(false)}
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
                const isOwnProfile = currentAuthUser?.id === member.id;

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
                        {friendStatus === "accepted" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            title="Already Friends"
                            className="cursor-default"
                          >
                            <UserCheck className="w-4 h-4 text-[var(--color-primary)]" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
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
                const isOwnProfile = currentAuthUser?.id === member.id;

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
                        {friendStatus === "accepted" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            title="Already Friends"
                            className="cursor-default"
                          >
                            <UserCheck className="w-4 h-4 text-[var(--color-primary)]" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
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
                const isOwnProfile = currentAuthUser?.id === member.id;

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
                        {friendStatus === "accepted" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            title="Already Friends"
                            className="cursor-default"
                          >
                            <UserCheck className="w-4 h-4 text-[var(--color-primary)]" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
