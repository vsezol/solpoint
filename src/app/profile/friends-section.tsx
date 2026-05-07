"use client";
// LEGACY ADAPTER: Удалить после ручного тестирования.

import { Card, Avatar } from "@/components/ui";
import Link from "next/link";
import type { User } from "@/types";

interface FriendsSectionProps {
  friends: User[];
  isOwnProfile: boolean;
}

export function FriendsSection({ friends, isOwnProfile }: FriendsSectionProps) {
  if (!isOwnProfile || friends.length === 0) {
    return null;
  }

  return (
    <Card variant="bordered">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)]">
          Friends
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          {friends.length} {friends.length === 1 ? "friend" : "friends"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {friends.map((friend) => (
          <Link
            key={friend.id}
            href={`/profile/${friend.id}`}
            className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-border)] transition-colors"
          >
            <Avatar
              src={friend.avatar_url}
              alt={friend.twitter_name}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {friend.twitter_name}
              </p>
              {friend.twitter_handle ? (
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  @{friend.twitter_handle}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
