"use client";

import { Avatar, Badge } from "@/components/ui";
import { Crown } from "lucide-react";
import { ProfileActions } from "./profile-actions";
import { AddFriendButton } from "./add-friend-button";
import { useProfileEdit } from "./profile-edit-provider";
import type { User } from "@/types";
import { getSubscriptionDisplayName } from "@/lib/utils";

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
  friendshipStatus?: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked";
}

export function ProfileHeader({ user, isOwnProfile, friendshipStatus = "none" }: ProfileHeaderProps) {
  // Если это не свой профиль, не используем контекст
  if (!isOwnProfile) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
        <Avatar
          src={user.avatar_url}
          alt={user.twitter_name}
          size="xl"
          isVip={user.subscription_tier === "vip"}
          isVerified={user.is_verified}
          className="ring-4 ring-[var(--color-background)]"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {user.twitter_name}
            </h1>
            {user.is_verified && (
              <Badge variant="primary" size="sm">
                Verified
              </Badge>
            )}
            {user.subscription_tier === "vip" && (
              <Badge variant="warning" size="sm">
                <Crown className="w-3 h-3 mr-1" />
                {getSubscriptionDisplayName(user.subscription_tier)}
              </Badge>
            )}
            {/* Отладка: показываем статус is_admin */}
            {('is_admin' in user) && (
              <Badge variant={user.is_admin === true ? "primary" : "secondary"} size="sm">
                {String(user.is_admin)} - {user.is_admin === true ? "ADMIN" : "NOT ADMIN"}
              </Badge>
            )}
          </div>
          <p className="text-[var(--color-text-muted)]">
            @{user.twitter_handle}
          </p>
        </div>
        <AddFriendButton 
          userId={user.id} 
          userHandle={user.twitter_handle}
          initialStatus={friendshipStatus} 
        />
      </div>
    );
  }

  // Для своего профиля используем контекст
  try {
    return <ProfileHeaderWithContext user={user} />;
  } catch {
    // Если контекст недоступен, рендерим без кнопок редактирования
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
        <Avatar
          src={user.avatar_url}
          alt={user.twitter_name}
          size="xl"
          isVip={user.subscription_tier === "vip"}
          isVerified={user.is_verified}
          className="ring-4 ring-[var(--color-background)]"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {user.twitter_name}
            </h1>
            {user.is_verified && (
              <Badge variant="primary" size="sm">
                Verified
              </Badge>
            )}
            {user.subscription_tier === "vip" && (
              <Badge variant="warning" size="sm">
                <Crown className="w-3 h-3 mr-1" />
                {getSubscriptionDisplayName(user.subscription_tier)}
              </Badge>
            )}
          {/* Отладка: показываем статус is_admin */}
          {('is_admin' in user) && (
            <Badge variant={user.is_admin === true ? "primary" : "secondary"} size="sm">
              {String(user.is_admin)} - {user.is_admin === true ? "ADMIN" : "NOT ADMIN"}
            </Badge>
          )}
        </div>
        <p className="text-[var(--color-text-muted)]">
          @{user.twitter_handle}
        </p>
      </div>
      <ProfileActions />
      </div>
    );
  }
}

function ProfileHeaderWithContext({ user }: { user: User }) {
  useProfileEdit(); // Проверяем наличие контекста
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
      <Avatar
        src={user.avatar_url}
        alt={user.twitter_name}
        size="xl"
        isVip={user.subscription_tier === "vip"}
        isVerified={user.is_verified}
        className="ring-4 ring-[var(--color-background)]"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {user.twitter_name}
          </h1>
          {user.is_verified && (
            <Badge variant="primary" size="sm">
              Verified
            </Badge>
          )}
            {user.subscription_tier === "vip" && (
              <Badge variant="warning" size="sm">
                <Crown className="w-3 h-3 mr-1" />
                {getSubscriptionDisplayName(user.subscription_tier)}
              </Badge>
            )}
          {/* Отладка: показываем статус is_admin */}
          {('is_admin' in user) && (
            <Badge variant={user.is_admin === true ? "primary" : "secondary"} size="sm">
              {String(user.is_admin)} - {user.is_admin === true ? "ADMIN" : "NOT ADMIN"}
            </Badge>
          )}
        </div>
        <p className="text-[var(--color-text-muted)]">
          @{user.twitter_handle}
        </p>
      </div>
      <ProfileActions />
    </div>
  );
}

