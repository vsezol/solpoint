"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button, Avatar, Card } from "@/components/ui";
import { 
  Twitter, 
  Instagram, 
  Facebook, 
  Send,
  Youtube,
  MessageSquare,
  Github,
  Linkedin,
  BookOpen,
  Rss,
  Wallet, 
  LogOut, 
  MapPin, 
  Users,
  Camera,
  UserPlus,
  Check,
  Copy,
  Loader2
} from "lucide-react";
import { ProfileEditForm } from "./profile-edit-form";
import { useProfileEdit } from "./profile-edit-provider";
import { EditProfileButton } from "./edit-profile-button";
import type { User, Invite } from "@/types";
import { getAppUrl } from "@/lib/utils";

interface ProfileMainSectionProps {
  user: User;
  isOwnProfile: boolean;
  friendsCount?: number;
}

export function ProfileMainSection({ user, isOwnProfile, friendsCount = 0 }: ProfileMainSectionProps) {
  const { isEditing, setIsEditing } = useProfileEdit();
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [isOpenToMeet, setIsOpenToMeet] = useState(user.is_open_to_meet);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<Invite | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Обновляем локальное состояние при изменении user prop
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // Загружаем существующие invites при загрузке компонента
  useEffect(() => {
    if (isOwnProfile) {
      fetchUserInvites();
    }
  }, [isOwnProfile]);

  const fetchUserInvites = async () => {
    setIsLoadingInvite(true);
    try {
      const response = await fetch("/api/invites");
      const data = await response.json();

      if (response.ok && data.data && data.data.length > 0) {
        // Находим первый активный invite
        // Проверяем срок действия только если expires_at задан
        // Проверяем max_uses только если он задан
        const activeInvite = data.data.find((invite: Invite) => {
          // Если expires_at не задан (null/undefined) - invite бессрочный
          const isNotExpired = !invite.expires_at || new Date(invite.expires_at) >= new Date();
          
          // Если max_uses не задан (null/undefined) - invite с бесконечным количеством использований
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
      setIsOpenToMeet(!newValue); // Revert on error
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate invite");
      }

      // Сохраняем новый invite
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
      
      // Сбрасываем состояние через 3 секунды
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload banner");
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete banner");
      }

      // Обновляем локальное состояние
      setCurrentUser({ ...currentUser, banner_url: undefined });
    } catch (error) {
      console.error("Error deleting banner:", error);
      alert(error instanceof Error ? error.message : "Failed to delete banner");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  return (
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
      </div>

      {/* Profile Info */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
                {currentUser.twitter_name}
              </h1>
              <p className="text-[var(--color-text-muted)]">
                @{currentUser.twitter_handle}
              </p>
            </div>
            {isOwnProfile && (
              <div>
                <EditProfileButton />
              </div>
            )}
          </div>
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
          {/* Wallet */}
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
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://twitter.com/${currentUser.twitter_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
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
                    className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {currentUser.socials?.telegram && (
                  <a
                    href={currentUser.socials.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label="Telegram"
                  >
                    <Send className="w-5 h-5" />
                  </a>
                )}
                {currentUser.socials?.youtube && (
                  <a
                    href={currentUser.socials.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label="YouTube"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {currentUser.socials?.discord && (
                  <a
                    href={currentUser.socials.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label="Discord"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </a>
                )}
                {currentUser.socials?.github && (
                  <a
                    href={currentUser.socials.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label="GitHub"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {currentUser.socials?.linkedin && (
                  <a
                    href={currentUser.socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {currentUser.socials?.medium && (
                  <a
                    href={currentUser.socials.medium}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label="Medium"
                  >
                    <BookOpen className="w-5 h-5" />
                  </a>
                )}
                {currentUser.socials?.substack && (
                  <a
                    href={currentUser.socials.substack}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label="Substack"
                  >
                    <Rss className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>

      

          {/* Open to meet and Logout */}
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
  );
}

