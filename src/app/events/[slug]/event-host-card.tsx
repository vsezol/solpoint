"use client";

import { useState } from "react";
import { UserCard } from "@/components/cards/user-card";
import { ProSubscriptionModal, AuthRequiredModal, Button } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import type { User } from "@/types";

interface EventHostCardProps {
  user: User;
  isVip: boolean;
  currentUserId?: string;
}

export function EventHostCard({ user, isVip, currentUserId }: EventHostCardProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <>
      <div className="relative">
        {!isAuthenticated && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                Sign up or log in to see the hosts
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="primary" size="sm" asChild>
                  <Link href="/signup">Sign up</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className={!isAuthenticated ? "blur-sm pointer-events-none opacity-50" : ""}>
          <UserCard
            user={user}
            isHost={true}
            isVip={isVip}
            compact={false}
            currentUserId={currentUserId}
            isBlurred={!isAuthenticated}
            isUnauthorized={!isAuthenticated}
            onProfileClick={(e) => {
              if (!isAuthenticated) {
                e.preventDefault();
                setShowAuthModal(true);
                return;
              }
              if (isAuthenticated && !isVip) {
                e.preventDefault();
                setShowProModal(true);
              }
            }}
          />
        </div>
      </div>
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign up or log in to view profiles"
        description="Please sign up or log in to view event host profiles."
      />
      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description="Viewing event host profile is available only with PRO subscription. Upgrade to PRO to unlock this feature."
      />
    </>
  );
}

