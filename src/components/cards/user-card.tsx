"use client";

import { Avatar, Badge, Button } from "@/components/ui";
import type { User } from "@/types";
import { Twitter, Instagram, Facebook, MessageCircle, UserPlus, MapPin, Briefcase, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface UserCardProps {
  user: User;
  isVip?: boolean;
  compact?: boolean;
  isBlurred?: boolean;
  onAddFriend?: () => void;
  onMessage?: () => void;
}

export function UserCard({
  user,
  isVip = false,
  compact = false,
  isBlurred = false,
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
      <div className="p-4 min-w-[280px]">
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
            {user.country}
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

        {/* Actions */}
        {isVip ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddFriend}
              className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)]"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Add fren
            </Button>
            <Button variant="outline" size="sm" onClick={onMessage} className="flex-1">
              <MessageCircle className="w-4 h-4 mr-1" />
              Send Message
            </Button>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <Button variant="secondary" size="sm" asChild>
                <Link href="/signup">Sign up / Log in</Link>
              </Button>
            </div>
            <div className="blur-sm pointer-events-none opacity-50">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Add fren
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Send Message
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full card view
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl p-5">
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
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <MapPin className="w-4 h-4" />
          <span>
            {user.country}
            {isVip && user.city && `, ${user.city}`}
          </span>
        </div>
        {user.role && (
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <Briefcase className="w-4 h-4" />
            <span>{roleLabels[user.role] || user.role}</span>
          </div>
        )}
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="text-[var(--color-text-secondary)] mb-4 line-clamp-3">
          {user.bio}
        </p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {user.is_open_to_meet && (
          <Badge variant="success">Open to meet</Badge>
        )}
        {user.subscription_tier === "vip" && (
          <Badge variant="warning">VIP</Badge>
        )}
      </div>

      {/* Socials */}
      <div className="flex items-center gap-3 mb-4">
        <a
          href={`https://twitter.com/${user.twitter_handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <Twitter className="w-5 h-5" />
        </a>
        {user.socials?.instagram && (
          <a
            href={user.socials.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Instagram className="w-5 h-5" />
          </a>
        )}
        {user.socials?.facebook && (
          <a
            href={user.socials.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Facebook className="w-5 h-5" />
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onAddFriend}
          className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add fren
        </Button>
        <Button variant="outline" onClick={onMessage} className="flex-1">
          <MessageCircle className="w-4 h-4 mr-2" />
          Send Message
        </Button>
      </div>
    </div>
  );
}

