"use client";

import { Avatar, Badge, Button } from "@/components/ui";
import type { User } from "@/types";
import { Twitter, Instagram, Facebook, UserPlus, MapPin, Briefcase, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface UserCardProps {
  user: User;
  isVip?: boolean;
  compact?: boolean;
  isBlurred?: boolean;
  isHost?: boolean;
  isUnauthorized?: boolean;
  onAddFriend?: () => void;
  onMessage?: () => void;
}

export function UserCard({
  user,
  isVip = false,
  compact = false,
  isBlurred = false,
  isHost = false,
  isUnauthorized = false,
  onAddFriend,
  onMessage,
}: UserCardProps) {
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
      <div className="p-4 min-w-[280px] relative">
        {/* Host Badge */}
        {isHost && (
          <div className="absolute top-4 right-4 z-20">
            <Badge variant="outline" className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
              Host
            </Badge>
          </div>
        )}
        
        {/* Content with blur if unauthorized */}
        <div className={cn(isUnauthorized && "blur-sm")}>
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
          <Avatar
            src={user.avatar_url}
            alt={user.twitter_name}
            size="lg"
            isVip={user.subscription_tier === "vip"}
            isVerified={user.is_verified}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
                {user.twitter_name}
              </h3>
              {user.is_verified && (
                <Check className="w-4 h-4 text-[var(--color-primary)]" />
              )}
            </div>
            {user.role && (
              <p className="text-sm text-[var(--color-text-muted)]">
                <span className="text-[var(--color-primary)]">Who:</span>{" "}
                {roleLabels[user.role] || user.role}
              </p>
            )}
          </div>
        </div>

        {/* Location */}
        <div className={cn("space-y-1 text-sm mb-3", isBlurred && !isVip && "blur-sm select-none")}>
          <p className="text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-primary)]">Country:</span>{" "}
            {(user as any).countries?.name || user.country || user.country_code || "Not specified"}
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
            {user.socials?.twitter && (
              <a
                href={`https://twitter.com/${user.twitter_handle}`}
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

        {/* Actions */}
        {isUnauthorized ? (
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
                  Add Friend
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
            <Button
              variant="outline"
              size="sm"
              onClick={onAddFriend}
              className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] font-semibold text-sm leading-none tracking-normal"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              {/* <UserPlus className="w-4 h-4 mr-1" /> */}
              Add Friend
            </Button>
            <Button variant="outline" size="sm" onClick={onMessage} className="flex-1 font-semibold text-sm leading-none tracking-normal border border-white" style={{ fontFamily: 'var(--font-inter)' }}>
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
    <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl p-5 relative">
      {/* Host Badge */}
      {isHost && (
        <div className="absolute top-5 right-5 z-20">
          <Badge variant="outline" className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
            Host
          </Badge>
        </div>
      )}
      
      {/* Content with blur if unauthorized */}
      <div className={cn(isUnauthorized && "blur-sm")}>
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
        <Avatar
          src={user.avatar_url}
          alt={user.twitter_name}
          size="xl"
          isVip={user.subscription_tier === "vip"}
          isVerified={user.is_verified}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {user.twitter_name}
            </h3>
            {user.is_verified && (
              <Check className="w-5 h-5 text-[var(--color-primary)]" />
            )}
          </div>
          <p className="text-[var(--color-text-muted)]">@{user.twitter_handle}</p>
          {user.role && (
            <Badge variant="primary" className="mt-2">
              {roleLabels[user.role] || user.role}
            </Badge>
          )}
        </div>
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
          <span>{(user as any).countries?.name || user.country || user.country_code || "Not specified"}</span>
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
      <div className="flex flex-wrap gap-2 mb-4">
        {user.is_open_to_meet && !isHost && (
          <Badge variant="success">Open to meet</Badge>
        )}
        {user.subscription_tier === "vip" && (
          <Badge variant="warning">VIP</Badge>
        )}
      </div>

      {/* Socials */}
      <div className="mb-4">
        <p className="text-xs text-[var(--color-text-muted)] mb-2">Socials:</p>
        <div className="flex items-center gap-2">
          {user.socials?.twitter && (
            <a
              href={`https://twitter.com/${user.twitter_handle}`}
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

      {/* Actions */}
      {isUnauthorized ? (
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
                Add Friend
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
          <Button
            variant="outline"
            onClick={onAddFriend}
            className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 font-semibold text-sm leading-none tracking-normal"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            {/* <UserPlus className="w-4 h-4 mr-2" /> */}
            Add Friend
          </Button>
          <Button variant="outline" onClick={onMessage} className="flex-1 font-semibold text-sm leading-none tracking-normal border border-white" style={{ fontFamily: 'var(--font-inter)' }}>
            {/* <MessageCircle className="w-4 h-4 mr-2" /> */}
            Send Message
          </Button>
        </div>
      )}
    </div>
  );
}

