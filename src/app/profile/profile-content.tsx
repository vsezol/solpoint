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
  Loader2
} from "lucide-react";
import Link from "next/link";
import type { User, Event, Invite } from "@/types";
import { getAppUrl } from "@/lib/utils";
import { ProfileEditForm } from "./profile-edit-form";
import { useProfileEdit } from "./profile-edit-provider";
import { AddFriendButton } from "./add-friend-button";
import { EditProfileButton } from "./edit-profile-button";
import { trackEvent } from "@/lib/analytics";

interface ProfileContentProps {
  user: User;
  isOwnProfile: boolean;
  friendshipStatus?: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked";
  friendsCount?: number;
  upcomingEvents: Event[]; // События, на которые идет пользователь
  pastEvents: Event[];
}

export function ProfileContent({
  user,
  isOwnProfile,
  friendshipStatus = "none",
  friendsCount = 0,
  upcomingEvents,
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

  // Обновляем локальное состояние при изменении user prop
  useEffect(() => {
    setCurrentUser(user);
    setIsOpenToMeet(user.is_open_to_meet);
  }, [user]);

  // Загружаем статистику и invites
  useEffect(() => {
    fetchStatistics();
    if (isOwnProfile) {
      fetchUserInvites();
    }
  }, [user, isOwnProfile]);

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

  const handleUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setIsOpenToMeet(updatedUser.is_open_to_meet);
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

  const handleGenerateInvite = async () => {
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
    } catch (error) {
      console.error("Error generating invite:", error);
      alert(error instanceof Error ? error.message : "Failed to generate invite");
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!currentInvite) return;

    const appUrl = getAppUrl();
    const inviteLink = `${appUrl}/signup?invite=${currentInvite.code}`;

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

            {/* Friends count */}
            <p className="text-[var(--color-text-secondary)]">
              {friendsCount} {friendsCount === 1 ? "fren" : "frens"}
            </p>
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
              {/* Wallet - только для своего профиля */}
              {isOwnProfile && (
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
              )}

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

              {/* Invite section - только для своего профиля */}
              {isOwnProfile && (
                <Card variant="bordered">
                  <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
                    Invite Friend
                  </h3>
                  {isLoadingInvite ? (
                    <div className="text-sm text-[var(--color-text-secondary)]">Loading...</div>
                  ) : currentInvite ? (
                    <div className="space-y-3">
                      <div className="bg-[var(--color-surface-hover)] rounded-lg p-3">
                        <p className="text-xs text-[var(--color-text-muted)] mb-1">Your invite link:</p>
                        <p className="text-sm font-mono text-[var(--color-text-primary)] break-all">
                          {`${getAppUrl()}/signup?invite=${currentInvite.code}`}
                        </p>
                      </div>
                      <Button
                        onClick={handleCopyInviteLink}
                        variant={isCopied ? "secondary" : "outline"}
                        size="sm"
                        className="w-full"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleGenerateInvite}
                      variant="primary"
                      size="sm"
                      className="w-full"
                      isLoading={isGeneratingInvite}
                      disabled={isGeneratingInvite}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Generate Invite Link
                    </Button>
                  )}
                </Card>
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
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Total users on SolPoint: <span className="text-[var(--color-text-primary)] font-medium">{totalUsers.toLocaleString()}</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Users in your country: <span className="text-[var(--color-text-primary)] font-medium">{usersInCountry.toLocaleString()}</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Users in your city: <span className="text-[var(--color-text-primary)] font-medium">{usersInCity.toLocaleString()}</span>
                </p>
              </div>
            </div>

            {/* Your mutuals - заглушка */}
            <div className="mb-4 pt-4 border-t border-[var(--color-surface-border)]">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                Your mutuals
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                <span className="text-[var(--color-text-primary)] font-medium">10</span> people you follow on Twitter are on SolPoint
              </p>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center -space-x-2">
                  {/* Заглушки аватаров */}
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full rounded-full bg-yellow-400"></div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full rounded-full bg-orange-400"></div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full rounded-full bg-purple-400"></div>
                  </div>
                </div>
                <Link
                  href="#"
                  className="text-sm text-[var(--color-primary)] hover:underline ml-auto"
                >
                  Show list
                </Link>
              </div>
            </div>

            {/* Invite button - только для своего профиля */}
            {isOwnProfile && (
              <>
                {isLoadingInvite ? (
                  <Button variant="primary" size="sm" className="w-full" disabled>
                    Loading...
                  </Button>
                ) : currentInvite ? (
                  <Button
                    onClick={handleCopyInviteLink}
                    variant={isCopied ? "secondary" : "primary"}
                    size="sm"
                    className="w-full"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Copy Invite Link
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerateInvite}
                    variant="primary"
                    size="sm"
                    className="w-full"
                    isLoading={isGeneratingInvite}
                    disabled={isGeneratingInvite}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Generate Invite Link
                  </Button>
                )}
              </>
            )}
          </Card>

          {/* What's happening */}
          <Card variant="bordered" className="w-full">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              What's happening
            </h3>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 3).map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${(event as Event & { slug?: string }).slug || event.id}`}
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

          {/* Upgrade to VIP */}
          {user.subscription_tier === "free" && (
            <Card variant="bordered" className="w-full bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                Upgrade to VIP
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
    </div>
  );
}
