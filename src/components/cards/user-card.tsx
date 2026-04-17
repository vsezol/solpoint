"use client";

import { useState } from "react";
import { Avatar, Badge, Button, ProSubscriptionModal } from "@/components/ui";
import type { User } from "@/types";
import { Twitter, Instagram, Facebook, Check, X, User as UserIcon, MapPin } from "lucide-react";
import { cn, getSubscriptionDisplayName } from "@/lib/utils";
import Link from "next/link";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { USER_ROLE_LABELS } from "@/lib/profile-taxonomy";

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

  const kmFont = { fontFamily: "var(--font-kode-mono), monospace" } as const;

  if (compact) {
    const location =
      [user.city, (user as User & { countries?: { name: string } }).countries?.name || user.country]
        .filter(Boolean)
        .join(", ") || "Location unknown";
    const roleLabel = user.role ? USER_ROLE_LABELS[user.role] || user.role : "Role not specified";
    const interStyle = { fontFamily: "var(--font-inter), system-ui, sans-serif" } as const;
    const sgStyle = { fontFamily: "var(--font-display), system-ui, sans-serif" } as const;
    const cardSurface = {
      border: "1px solid transparent",
      background: `
        linear-gradient(180deg, #0B0B0B 0%, #030303 100%) padding-box,
        linear-gradient(180deg, #00F68B 0%, rgba(0,246,139,0.38) 46%, rgba(0,246,139,0) 76%) border-box
      `,
      backgroundClip: "padding-box, border-box",
    } as const;

    return (
      <div
        className="relative isolate flex w-[256px] flex-col overflow-hidden rounded-[3px] p-4 shadow-[0_0_18px_rgba(0,246,139,0.12)]"
        style={cardSurface}
      >
        {/* Bottom fade */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,transparent_0%,transparent_46%,rgba(0,0,0,0.45)_72%,#000000_100%)]"
          aria-hidden
        />

        <div className="relative z-10 flex flex-col">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-[#E8F5ED] p-[3px]">
              <Avatar
                src={user.avatar_url}
                alt={user.twitter_name}
                size="card"
                isVip={user.subscription_tier === "vip"}
                isVerified={user.is_verified}
                fallbackVariant="branded"
              />
            </div>
            <h4
              className="mt-[15px] max-w-full truncate text-center text-[20px] font-extrabold leading-none text-white"
              style={interStyle}
              title={user.twitter_name}
            >
              {user.twitter_name}
            </h4>
          </div>

          {/* Role + Location */}
          <div className="mt-[33px] w-full space-y-5 text-[15px] font-medium leading-none">
            <p className="flex items-start gap-2 text-[#14f195]" style={kmFont}>
              <UserIcon className="mt-px h-[15px] w-[15px] shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="min-w-0 break-words">{roleLabel}</span>
            </p>
            <p className="flex items-start gap-2 text-[#14f195]" style={kmFont}>
              <MapPin className="mt-px h-[15px] w-[15px] shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="min-w-0 break-words">{location}</span>
            </p>
          </div>

          {/* About */}
          <div className="mt-[11px] flex flex-col">
            <p
              className="text-center text-[15px] font-medium leading-none text-[#70767d]"
              style={kmFont}
            >
              About
            </p>
            <p
              className="mt-[9px] line-clamp-4 text-left text-[12px] font-medium leading-normal text-white"
              style={sgStyle}
            >
              {user.bio || "Profile has no about yet."}
            </p>
          </div>

          {/* View button */}
          <Link
            href={`/profile/${user.twitter_handle}`}
            onClick={onProfileClick}
            className="mt-6 mx-auto flex h-[49px] w-[164px] shrink-0 items-center justify-center rounded-[7px] bg-white text-[20px] font-bold leading-none tracking-[-0.05em] text-black transition-colors hover:bg-white/90"
            style={kmFont}
          >
            View
          </Link>
        </div>
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
                    {USER_ROLE_LABELS[user.role] || user.role}
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
            <span>{USER_ROLE_LABELS[user.role] || user.role}</span>
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
                Connect
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
            // Показываем Connect если нет дружбы
              <Button
              variant="outline"
              onClick={onAddFriend}
              className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 font-semibold text-sm leading-none tracking-normal cursor-pointer"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              {/* <UserPlus className="w-4 h-4 mr-2" /> */}
              Connect
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
