"use client";

import { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import { Twitter, Instagram, Facebook, Wallet, LogOut, UserPlus, Check, Copy } from "lucide-react";
import { ProfileView } from "./profile-view";
import { ProfileEditForm } from "./profile-edit-form";
import { useProfileEdit } from "./profile-edit-provider";
import { FriendsSection } from "./friends-section";
import { getAppUrl } from "@/lib/utils";
import type { User, Invite } from "@/types";

interface ProfileInfoSectionProps {
  user: User;
  isOwnProfile: boolean;
  friends?: User[];
}

export function ProfileInfoSection({ user, isOwnProfile, friends = [] }: ProfileInfoSectionProps) {
  const { isEditing, setIsEditing } = useProfileEdit();
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<Invite | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);

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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json().catch((err) => {
        console.error("Error parsing invites response:", err);
        return { data: [] };
      });

      if (data.data && data.data.length > 0) {
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
      // Не показываем ошибку пользователю, просто не загружаем invites
    } finally {
      setIsLoadingInvite(false);
    }
  };

  const handleUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
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

  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Bio and Details - Editable section */}
      {isEditing ? (
        <ProfileEditForm 
          user={currentUser} 
          onCancel={() => setIsEditing(false)}
          onUpdate={handleUpdate}
        />
      ) : (
        <ProfileView user={currentUser} />
      )}

      {/* Friends - только для своего профиля */}
      {isOwnProfile && <FriendsSection friends={friends} isOwnProfile={isOwnProfile} />}

      {/* Socials - только просмотр */}
      <Card variant="bordered">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
          Socials
        </h3>
        <div className="flex gap-2">
          <a
            href={`https://twitter.com/${currentUser.twitter_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Twitter className="w-5 h-5" />
          </a>
          {currentUser.socials?.instagram && (
            <a
              href={currentUser.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
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
            >
              <Facebook className="w-5 h-5" />
            </a>
          )}
        </div>
      </Card>

      {/* Wallet - только для своего профиля */}
      {isOwnProfile && (
        <Card variant="bordered">
          <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
            Wallet
          </h3>
          {currentUser.wallet_address ? (
            <p className="text-sm font-mono text-[var(--color-text-secondary)] truncate">
              {currentUser.wallet_address}
            </p>
          ) : (
            <Button variant="outline" size="sm" className="w-full">
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          )}
        </Card>
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

      {/* Logout button - только для своего профиля */}
      {isOwnProfile && (
        <Card variant="bordered">
          <form action="/api/auth/logout" method="POST">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full text-red-500 hover:text-red-600 hover:border-red-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

