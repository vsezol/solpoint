"use client";

import { AuthRequiredModal, Avatar, Badge, Button } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { USER_ROLE_LABELS } from "@/lib/profile-taxonomy";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import { Check, Facebook, Instagram, Twitter, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface UserCardProps {
  user: User;
  compact?: boolean;
  isBlurred?: boolean;
  isHost?: boolean;
  isUnauthorized?: boolean;
  isFriend?: boolean;
  friendshipStatus?: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked";
  onAddFriend?: () => void;
  onRemoveFriend?: () => void;
  onMessage?: () => void;
  currentUserId?: string;
  onProfileClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function UserCard({
  user,
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState("Log in or Sign up to continue");

  const canRevealSocials =
    user.id === currentUserId || user.id === currentUser?.id || isFriend || friendshipStatus === "accepted";

  const handleMessage = () => {
    if (onMessage) onMessage();
    else openChat(user.id);
  };

  const kmFont = { fontFamily: "var(--font-kode-mono), monospace" } as const;

  if (compact) {
    return (
      <div className="p-4 min-w-[280px] max-w-[350px] bg-[#101319] border border-white/8 rounded-[10px]">
        <div className={cn(isUnauthorized && "blur-sm")}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <Link
              href={`/profile/${user.id}`}
              className="flex items-start gap-3 hover:opacity-80 transition-opacity"
              onClick={onProfileClick}
            >
              <Avatar
                src={user.avatar_url}
                alt={user.twitter_name}
                size="lg"
                isVerified={user.is_verified}
                fallbackVariant="branded"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white truncate" style={kmFont}>
                    {user.twitter_name}
                  </h3>
                  {user.is_verified && <Check className="w-4 h-4 text-[#14f195]" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {user.role && (
                    <Badge variant="primary" className="w-fit">
                      {USER_ROLE_LABELS[user.role] || user.role}
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
            {isHost && (
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                Host
              </Badge>
            )}
          </div>

          <div className={cn("space-y-1 text-sm mb-3", isBlurred && "blur-sm select-none")} style={kmFont}>
            <p className="text-white/70">
              <span className="text-[#14f195]">Country:</span>{" "}
              {(user as User & { countries?: { name: string } }).countries?.name ||
                user.country ||
                user.country_code ||
                "Not specified"}
            </p>
            {user.city && (
              <p className="text-white/70">
                <span className="text-[#14f195]">City:</span> {user.city}
              </p>
            )}
          </div>

          {user.bio && (
            <div className="mb-3">
              <p className="text-xs text-[#14f195] mb-1" style={kmFont}>
                BIO:
              </p>
              <p className="text-sm text-white/70 line-clamp-3" style={kmFont}>
                {user.bio}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-white/40" style={kmFont}>
              Socials:
            </span>
            {canRevealSocials && (user.socials?.twitter || user.twitter_handle) && (
              <a
                href={user.socials?.twitter || `https://twitter.com/${user.twitter_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-[5px] bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {user.socials?.instagram && (
              <a
                href={user.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-[5px] bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {user.socials?.facebook && (
              <a
                href={user.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-[5px] bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {user.id === currentUserId ? null : isUnauthorized ? (
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAuthModalTitle("Log in or Sign up to connect with users");
                  setShowAuthModal(true);
                }}
              >
                Log in / Sign up
              </Button>
            </div>
            <div className={cn("pointer-events-none opacity-50", isUnauthorized && "blur-sm")}>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-[7px] border border-[#14f195] py-2 text-sm font-bold text-[#14f195]"
                  style={kmFont}
                >
                  Connect
                </button>
                <button
                  className="flex-1 rounded-[7px] border border-white/20 py-2 text-sm font-bold text-white/80"
                  style={kmFont}
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {(isFriend || friendshipStatus === "accepted") ? (
              <button
                disabled
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[7px] border border-white/20 py-2 text-sm font-bold text-white/50 cursor-default"
                style={kmFont}
              >
                <Check className="w-4 h-4" />
                Friends
              </button>
            ) : friendshipStatus === "pending_sent" && onRemoveFriend ? (
              <button
                onClick={onRemoveFriend}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[7px] border border-white/20 py-2 text-sm font-bold text-white/70 transition-opacity hover:opacity-80 cursor-pointer"
                style={kmFont}
              >
                <X className="w-4 h-4" />
                Cancel Request
              </button>
            ) : onAddFriend ? (
              <button
                onClick={onAddFriend}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[7px] border border-[#14f195] py-2 text-sm font-bold text-[#14f195] transition-opacity hover:opacity-80 cursor-pointer"
                style={kmFont}
              >
                Connect
              </button>
            ) : null}
            <button
              onClick={handleMessage}
              disabled={isChatLoading}
              className="flex flex-1 items-center justify-center rounded-[7px] border border-white/20 py-2 text-sm font-bold text-white/80 transition-opacity hover:opacity-80 cursor-pointer disabled:opacity-50"
              style={kmFont}
            >
              Send Message
            </button>
          </div>
        )}

        <AuthRequiredModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          variant="compact"
          title={authModalTitle}
        />
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl p-5 w-fit">
      <div className={cn(isUnauthorized && "blur-sm")}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <Link href={`/profile/${user.id}`} className="flex items-start gap-4 hover:opacity-80 transition-opacity">
            <Avatar src={user.avatar_url} alt={user.twitter_name} size="xl" isVerified={user.is_verified} />
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">{user.twitter_name}</h3>
                {user.is_verified && <Check className="w-5 h-5 text-[var(--color-primary)]" />}
              </div>
              {canRevealSocials && user.twitter_handle ? (
                <p className="text-[var(--color-text-muted)]">@{user.twitter_handle}</p>
              ) : null}
              <div className="flex items-center gap-2 mt-2">
                {user.role && (
                  <Badge variant="primary" className="w-fit">
                    {USER_ROLE_LABELS[user.role] || user.role}
                  </Badge>
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

        <div className="space-y-2 mb-4">
          {user.role && (
            <div className="text-[var(--color-text-secondary)]">
              <span className="text-[var(--color-text-muted)]">Who:</span>{" "}
              <span>{USER_ROLE_LABELS[user.role] || user.role}</span>
            </div>
          )}
          <div className="text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-muted)]">Country:</span>{" "}
            <span>
              {(user as User & { countries?: { name: string } }).countries?.name ||
                user.country ||
                user.country_code ||
                "Not specified"}
            </span>
          </div>
          {user.city && (
            <div className="text-[var(--color-text-secondary)]">
              <span className="text-[var(--color-text-muted)]">City:</span> <span>{user.city}</span>
            </div>
          )}
        </div>

        {user.bio && (
          <div className="mb-4">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">BIO:</p>
            <p className="text-[var(--color-text-secondary)] line-clamp-3">{user.bio}</p>
          </div>
        )}

        {user.is_open_to_meet && !isHost && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="success">Open to meet</Badge>
          </div>
        )}

        <div className="mb-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-2">Socials:</p>
          <div className="flex items-center gap-2">
            {canRevealSocials && (user.socials?.twitter || user.twitter_handle) && (
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

      {user.id === currentUserId ? null : isUnauthorized ? (
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Button
              variant="secondary"
              onClick={() => {
                setAuthModalTitle("Log in or Sign up to connect with users");
                setShowAuthModal(true);
              }}
            >
              Log in / Sign up
            </Button>
          </div>
          <div className={cn("pointer-events-none opacity-50", isUnauthorized && "blur-sm")}>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 font-semibold text-sm leading-none tracking-normal"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                Connect
              </Button>
              <Button
                variant="outline"
                className="flex-1 font-semibold text-sm leading-none tracking-normal border border-white"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                Send Message
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          {(isFriend || friendshipStatus === "accepted") ? (
            <Button
              variant="outline"
              disabled
              className="flex-1 text-[var(--color-text-secondary)] border-[var(--color-surface-border)] font-semibold text-sm leading-none tracking-normal cursor-default"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              <Check className="w-4 h-4 mr-2" />
              Friends
            </Button>
          ) : friendshipStatus === "pending_sent" && onRemoveFriend ? (
            <Button
              variant="outline"
              onClick={onRemoveFriend}
              className="flex-1 text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)] font-semibold text-sm leading-none tracking-normal cursor-pointer"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Request
            </Button>
          ) : onAddFriend ? (
            <Button
              variant="outline"
              onClick={onAddFriend}
              className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 font-semibold text-sm leading-none tracking-normal cursor-pointer"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Connect
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={handleMessage}
            disabled={isChatLoading}
            isLoading={isChatLoading}
            className="flex-1 font-semibold text-sm leading-none tracking-normal border border-white cursor-pointer"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Send Message
          </Button>
        </div>
      )}

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        variant="compact"
        title={authModalTitle}
      />
    </div>
  );
}
