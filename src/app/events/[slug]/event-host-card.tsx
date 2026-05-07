"use client";

import { useState } from "react";
import { AuthRequiredModal, Button, Avatar } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import type { User, ExternalUser } from "@/types";
import { normalizeTwitterAvatarUrl } from "@/lib/twitter-avatar";

interface EventHostCardPropsBase {
  currentUserId?: string;
}

interface EventHostCardPropsUser extends EventHostCardPropsBase {
  user: User;
  externalUser?: never;
}

interface EventHostCardPropsExternal extends EventHostCardPropsBase {
  user?: never;
  externalUser: ExternalUser;
}

type EventHostCardProps = EventHostCardPropsUser | EventHostCardPropsExternal;

export function EventHostCard({ user, externalUser, currentUserId }: EventHostCardProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated } = useAuth();

  if (externalUser) {
    const avatarSrc = externalUser.avatar
      ? normalizeTwitterAvatarUrl(externalUser.avatar)
      : null;
    return (
      <div className="p-4 min-w-[280px] max-w-[350px] bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--color-surface-hover)] flex-shrink-0">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt={externalUser.name ?? ""} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)] text-sm font-medium">
                {externalUser.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--color-text-primary)] truncate">{externalUser.name}</p>
            {externalUser.profile_url && (
              <a
                href={externalUser.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                View profile
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {!isAuthenticated && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-xl">
          <div className="text-center p-4">
            <p className="text-white text-sm mb-3">Sign in to view host profile</p>
            <Button variant="primary" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      )}
      <div className={!isAuthenticated ? "blur-sm pointer-events-none opacity-50" : ""}>
        <div className="p-4 min-w-[280px] max-w-[350px] bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl">
          <div className="flex items-center gap-3">
            <Avatar
              src={user.avatar_url}
              alt={user.twitter_name}
              size="lg"
              isVerified={user.is_verified}
            />
            <div className="flex-1 min-w-0">
              <Link
                href={`/profile/${user.id}`}
                className="font-semibold text-[var(--color-text-primary)] truncate hover:underline block"
                onClick={(e) => {
                  if (!isAuthenticated) {
                    e.preventDefault();
                    setShowAuthModal(true);
                  }
                }}
              >
                {user.twitter_name}
              </Link>
            </div>
          </div>
        </div>
      </div>
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        variant="compact"
        title="Log in or Sign up to view profiles"
      />
    </div>
  );
}
