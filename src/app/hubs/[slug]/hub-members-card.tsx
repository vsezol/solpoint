"use client";

import { useState } from "react";
import { Card, Button, ProSubscriptionModal } from "@/components/ui";
import { UserCard } from "@/components/cards/user-card";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@/types";

interface HubMembersCardProps {
  members: (User & { joined_at?: string })[];
  isVip: boolean;
  authUser: { id: string } | null;
  hubSlug: string;
}

export function HubMembersCard({ members, isVip, authUser, hubSlug }: HubMembersCardProps) {
  const [showProModal, setShowProModal] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Card variant="bordered">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          Members
        </h3>
        {authUser ? (
          <div className="space-y-4">
            {members.length > 0 ? (
              <>
                <div className="space-y-3">
                  {members.slice(0, 5).map((member) => (
                    <UserCard
                      key={member.id}
                      user={member}
                      isVip={isVip}
                      compact={true}
                    />
                  ))}
                </div>
                {members.length > 5 && (
                  <div className="text-center">
                    <p className="text-sm text-[var(--color-text-muted)] mb-2">
                      +{members.length - 5} more members
                    </p>
                    {isAuthenticated && !isVip ? (
                      <button
                        onClick={() => setShowProModal(true)}
                        className="text-xs text-[var(--color-primary)] hover:underline"
                      >
                        Show all members
                      </button>
                    ) : (
                      <Link
                        href={`/hubs/${hubSlug}?tab=members`}
                        className="text-xs text-[var(--color-primary)] hover:underline"
                      >
                        Show all members
                      </Link>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)] text-center">
                No members yet
              </p>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                  Sign up or log in to see team members
                </p>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" asChild>
                    <Link href="/signup">Sign up</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/login">Log in</Link>
                  </Button>
                </div>
              </div>
            </div>
            <div className="blur-sm pointer-events-none opacity-50">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[var(--color-surface-border)] rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description="Viewing all hub members is available only with PRO subscription. Upgrade to PRO to unlock this feature."
      />
    </>
  );
}

