"use client";

import { useState } from "react";
import { Avatar, Badge, Button, ProSubscriptionModal } from "@/components/ui";
import type { User } from "@/types";
import { Twitter, Instagram, Facebook, Check, X } from "lucide-react";
import { cn, getSubscriptionDisplayName } from "@/lib/utils";
import Link from "next/link";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";

interface UserCardProps {
  user: User;
  isVip?: boolean;
  compact?: boolean;
  isBlurred?: boolean;
  isHost?: boolean;
  isUnauthorized?: boolean;
  isFriend?: boolean; // Является ли пользователь другом (взаимная подписка)
  friendshipStatus?: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked"; // Детальный статус дружбы
  onAddFriend?: () => void;
  onRemoveFriend?: () => void; // Для отписки/отмены запроса
  onMessage?: () => void;
  currentUserId?: string; // ID текущего пользователя для проверки, является ли это собственный профиль
  onProfileClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void; // Обработчик клика на профиль
}

export function UserCard({
  user,
  isVip = false,
  compact = false,
  isBlurred = false,
  isHost = false,
  isUnauthorized = false,
  isFriend = false,
  friendshipStatus,
  onAddFriend,
  onRemoveFriend,
  onMessage,
  currentUserId,
  onProfileClick,
}: UserCardProps) {
  const { openChat, isLoading: isChatLoading } = useChat();
  const { user: currentUser } = useAuth();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleMessage = () => {
    if (onMessage) {
      onMessage();
    } else {
      // Check if user has PRO subscription
      if (currentUser?.subscription_tier !== "vip") {
        setShowSubscriptionModal(true);
        return;
      }
      openChat(user.id);
    }
  };

  const roleLabels: Record<string, string> = {
    developer: "Developer",
    trader: "Trader",
    investor: "Investor",
    designer: "Designer",
    founder: "Founder",
    degen: "Degen",
    other: "Other",
  };

  if (compact) {
    return (
      <div className="p-4 min-w-[280px] max-w-[350px] bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl">
        {/* Content with blur if unauthorized */}
        <div className={cn(isUnauthorized && "blur-sm")}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <Link 
              href={`/profile/${user.twitter_handle}`}
              className="flex items-start gap-3 hover:opacity-80 transition-opacity"
              onClick={onProfileClick}
            >
              <Avatar
                src={user.avatar_url}
                alt={user.twitter_name}
                size="lg"
                isVip={user.subscription_tier === "vip"}
                isVerified={user.is_verified}
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
                    {user.twitter_name}
                  </h3>
                  {user.is_verified && (
                    <Check className="w-4 h-4 text-[var(--color-primary)]" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {user.role && (
                    <Badge variant="primary" className="w-fit">
                      {roleLabels[user.role] || user.role}
                    </Badge>
                  )}
                  {user.subscription_tier === "vip" && (
                    <Badge variant="warning">Pro</Badge>
                  )}
                </div>
              </div>
            </Link>
            {isHost && (
              <Badge variant="outline" className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                Host
              </Badge>
            )}
          </div>

        {/* Location */}
        <div className={cn("space-y-1 text-sm mb-3", isBlurred && !isVip && "blur-sm select-none")}>
          <p className="text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-primary)]">Country:</span>{" "}
            {(user as User & { countries?: { name: string } }).countries?.name || user.country || user.country_code || "Not specified"}
          </p>
          {isVip && user.city && (
            <p className="text-[var(--color-text-secondary)]">
              <span className="text-[var(--color-primary)]">City:</span>{" "}
              {user.city}
            </p>
          )}
        </div>

        {/* Bio */}
        {isVip && user.bio && (
          <div className="mb-3">
            <p className="text-xs text-[var(--color-primary)] mb-1">BIO:</p>
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
              {user.bio}
            </p>
          </div>
        )}

        {/* Socials */}
        {isVip && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-[var(--color-text-muted)]">Socials:</span>
            {(user.socials?.twitter || user.twitter_handle) && (
              <a
                href={user.socials?.twitter || `https://twitter.com/${user.twitter_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {user.socials?.instagram && (
              <a
                href={user.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {user.socials?.facebook && (
              <a
                href={user.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        </div>

        {/* Actions - не показываем, если это собственный профиль */}
        {user.id === currentUserId ? null : isUnauthorized ? (
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Button variant="secondary" size="sm" asChild>
                <Link href="/signup">Sign up / Log in</Link>
              </Button>
            </div>
            <div className={cn("pointer-events-none opacity-50", isUnauthorized && "blur-sm")}>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] font-semibold text-sm leading-none tracking-normal" style={{ fontFamily: 'var(--font-inter)' }}>
                  {/* <UserPlus className="w-4 h-4 mr-1" /> */}
                  Add Fren
                </Button>
                <Button variant="outline" size="sm" className="flex-1 font-semibold text-sm leading-none tracking-normal border border-white" style={{ fontFamily: 'var(--font-inter)' }}>
                  {/* <MessageCircle className="w-4 h-4 mr-1" /> */}
                  Send Message
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {/* Показываем статус Friends если пользователи друзья */}
            {(isFriend || friendshipStatus === "accepted") ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="flex-1 text-[var(--color-text-secondary)] border-[var(--color-surface-border)] font-semibold text-sm leading-none tracking-normal cursor-default"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                <Check className="w-4 h-4 mr-1" />
                Friends
              </Button>
            ) : friendshipStatus === "pending_sent" && onRemoveFriend ? (
              // Показываем Cancel Request если запрос отправлен
              <Button
                variant="outline"
                size="sm"
                onClick={onRemoveFriend}
                className="flex-1 text-[var(--color-text-secondary)] border-[var(--color-surface-border)] font-semibold text-sm leading-none tracking-normal cursor-pointer"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel Request
              </Button>
            ) : onAddFriend ? (
              // Показываем Add Fren если нет дружбы
              <Button
                variant="outline"
                size="sm"
                onClick={onAddFriend}
                className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] font-semibold text-sm leading-none tracking-normal cursor-pointer"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {/* <UserPlus className="w-4 h-4 mr-1" /> */}
                Add Fren
              </Button>
            ) : null}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMessage}
              disabled={isChatLoading}
              isLoading={isChatLoading}
              className="flex-1 font-semibold text-sm leading-none tracking-normal border border-white cursor-pointer" 
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              {/* <MessageCircle className="w-4 h-4 mr-1" /> */}
              Send Message
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Full card view
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl p-5 w-fit">
      {/* Content with blur if unauthorized */}
      <div className={cn(isUnauthorized && "blur-sm")}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <Link 
            href={`/profile/${user.twitter_handle}`}
            className="flex items-start gap-4 hover:opacity-80 transition-opacity"
          >
            <Avatar
              src={user.avatar_url}
              alt={user.twitter_name}
              size="xl"
              isVip={user.subscription_tier === "vip"}
              isVerified={user.is_verified}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  {user.twitter_name}
                </h3>
                {user.is_verified && (
                  <Check className="w-5 h-5 text-[var(--color-primary)]" />
                )}
              </div>
              <p className="text-[var(--color-text-muted)]">@{user.twitter_handle}</p>
              <div className="flex items-center gap-2 mt-2">
                {user.role && (
                  <Badge variant="primary" className="w-fit">
                    {roleLabels[user.role] || user.role}
                  </Badge>
                )}
                {user.subscription_tier === "vip" && (
                  <Badge variant="warning">{getSubscriptionDisplayName(user.subscription_tier)}</Badge>
                )}
              </div>
            </div>
          </Link>
          {isHost && (
            <Badge variant="outline" className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
              Host
            </Badge>
          )}
        </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        {user.role && (
          <div className="text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-muted)]">Who:</span>{" "}
            <span>{roleLabels[user.role] || user.role}</span>
          </div>
        )}
        <div className="text-[var(--color-text-secondary)]">
          <span className="text-[var(--color-text-muted)]">Country:</span>{" "}
          <span>{(user as User & { countries?: { name: string } }).countries?.name || user.country || user.country_code || "Not specified"}</span>
        </div>
        {user.city && (
          <div className="text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-muted)]">City:</span>{" "}
            <span>{user.city}</span>
          </div>
        )}
      </div>

      {/* Bio */}
      {user.bio && (
        <div className="mb-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">BIO:</p>
          <p className="text-[var(--color-text-secondary)] line-clamp-3">
            {user.bio}
          </p>
        </div>
      )}

      {/* Tags */}
      {user.is_open_to_meet && !isHost && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="success">Open to meet</Badge>
        </div>
      )}

      {/* Socials */}
      <div className="mb-4">
        <p className="text-xs text-[var(--color-text-muted)] mb-2">Socials:</p>
        <div className="flex items-center gap-2">
          {(user.socials?.twitter || user.twitter_handle) && (
            <a
              href={user.socials?.twitter || `https://twitter.com/${user.twitter_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Twitter className="w-4 h-4" />
            </a>
          )}
          {user.socials?.instagram && (
            <a
              href={user.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
          )}
          {user.socials?.facebook && (
            <a
              href={user.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      </div>

      {/* Actions - не показываем, если это собственный профиль */}
      {user.id === currentUserId ? null : isUnauthorized ? (
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Button variant="secondary" asChild>
              <Link href="/signup">Sign up / Log in</Link>
            </Button>
          </div>
          <div className={cn("pointer-events-none opacity-50", isUnauthorized && "blur-sm")}>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 font-semibold text-sm leading-none tracking-normal"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {/* <UserPlus className="w-4 h-4 mr-2" /> */}
                Add Fren
              </Button>
              <Button variant="outline" className="flex-1 font-semibold text-sm leading-none tracking-normal border border-white" style={{ fontFamily: 'var(--font-inter)' }}>
                {/* <MessageCircle className="w-4 h-4 mr-2" /> */}
                Send Message
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          {/* Показываем статус Friends если пользователи друзья */}
          {(isFriend || friendshipStatus === "accepted") ? (
            <Button
              variant="outline"
              disabled
              className="flex-1 text-[var(--color-text-secondary)] border-[var(--color-surface-border)] font-semibold text-sm leading-none tracking-normal cursor-default"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              <Check className="w-4 h-4 mr-2" />
              Friends
            </Button>
          ) : friendshipStatus === "pending_sent" && onRemoveFriend ? (
            // Показываем Cancel Request если запрос отправлен
            <Button
              variant="outline"
              onClick={onRemoveFriend}
              className="flex-1 text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)] font-semibold text-sm leading-none tracking-normal cursor-pointer"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Request
            </Button>
          ) : onAddFriend ? (
            // Показываем Add Fren если нет дружбы
              <Button
              variant="outline"
              onClick={onAddFriend}
              className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 font-semibold text-sm leading-none tracking-normal cursor-pointer"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              {/* <UserPlus className="w-4 h-4 mr-2" /> */}
              Add Fren
            </Button>
          ) : null}
          <Button 
            variant="outline" 
            onClick={handleMessage}
            disabled={isChatLoading}
            isLoading={isChatLoading}
            className="flex-1 font-semibold text-sm leading-none tracking-normal border border-white cursor-pointer" 
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            {/* <MessageCircle className="w-4 h-4 mr-2" /> */}
            Send Message
          </Button>
        </div>
      )}
      
      {/* Subscription Modal */}
      <ProSubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        title="Private messaging is available only with PRO subscription"
        description="Upgrade to PRO to send direct messages to other users."
      />
    </div>
  );
}

