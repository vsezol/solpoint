"use client";

import { useState } from "react";
import { Card, Avatar, Button, ProSubscriptionModal } from "@/components/ui";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@/types";
import { MembersModal } from "./members-modal";

interface MembersSidebarProps {
  members: User[];
  friends?: User[]; // Друзья, которые являются участниками
  isVip: boolean;
  authUser: { id: string } | null;
  entitySlug: string;
  entityType: "hub" | "community" | "project" | "workspace" | "event";
  membersCount: number; // Общее количество участников
  friendsCount?: number; // Количество друзей-участников
}

export function MembersSidebar({
  members,
  friends = [],
  isVip,
  authUser,
  entitySlug,
  entityType,
  membersCount,
  friendsCount = 0,
}: MembersSidebarProps) {
  const { user, isAuthenticated } = useAuth();
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  const getEntityPath = (slug: string) => {
    switch (entityType) {
      case "hub":
        return `/hubs/${slug}`;
      case "community":
        return `/communities/${slug}`;
      case "project":
        return `/projects/${slug}`;
      case "workspace":
        return `/workspaces/${slug}`;
      case "event":
        return `/events/${slug}`;
      default:
        return `/${entityType}s/${slug}`;
    }
  };

  const getEntityName = () => {
    switch (entityType) {
      case "hub":
        return "hub";
      case "community":
        return "community";
      case "project":
        return "project";
      case "workspace":
        return "workspace";
      case "event":
        return "event";
      default:
        return "entity";
    }
  };

  const getMemberLabel = () => {
    return entityType === "event" ? "attendee" : "member";
  };

  const getMembersLabel = () => {
    return entityType === "event" ? "attendees" : "members";
  };

  const visibleMembers = members.slice(0, 3);
  const remainingMembers = membersCount - visibleMembers.length;

  const visibleFriends = friends.slice(0, 2);
  const remainingFriends = friendsCount - visibleFriends.length;

  const handleShowAllMembers = () => {
    if (!isAuthenticated) {
      // Можно показать модальное окно для авторизации
      return;
    }
    if (!isVip) {
      setShowProModal(true);
      return;
    }
    setShowMembersModal(true);
  };

  const handleShowAllFriends = () => {
    if (!isAuthenticated) {
      return;
    }
    if (!isVip) {
      setShowProModal(true);
      return;
    }
    setShowFriendsModal(true);
  };

  return (
    <>
      <Card variant="bordered">
        <div className="space-y-6">
          {/* Members/Attendees on SolPoint */}
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">
              {membersCount} {membersCount === 1 ? "person is" : "people are"} {getMemberLabel()}{membersCount === 1 ? "" : "s"} of this {getEntityName()}
            </p>
            {authUser && members.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  {visibleMembers.map((member) => (
                    <Link
                      key={member.id}
                      href={`/profile/${member.twitter_handle}`}
                    >
                      <Avatar
                        src={member.avatar_url}
                        alt={member.twitter_name}
                        size="sm"
                        isVip={member.subscription_tier === "vip"}
                        isVerified={member.is_verified}
                      />
                    </Link>
                  ))}
                  {remainingMembers > 0 && (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                      +{remainingMembers}
                    </div>
                  )}
                </div>
                {membersCount > 3 && (
                  <button
                    onClick={handleShowAllMembers}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    Show all {getMembersLabel()}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                No {getMembersLabel()} yet
              </p>
            )}
          </div>

          {/* Friends who are members/attendees */}
          {authUser && friendsCount > 0 && (
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                {friendsCount} {friendsCount === 1 ? "fren is" : "frens are"} {getMemberLabel()}{friendsCount === 1 ? "" : "s"} of this {getEntityName()}
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {visibleFriends.map((friend) => (
                  <Link
                    key={friend.id}
                    href={`/profile/${friend.twitter_handle}`}
                  >
                    <Avatar
                      src={friend.avatar_url}
                      alt={friend.twitter_name}
                      size="sm"
                      isVip={friend.subscription_tier === "vip"}
                      isVerified={friend.is_verified}
                    />
                  </Link>
                ))}
                {remainingFriends > 0 && (
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                    +{remainingFriends}
                  </div>
                )}
              </div>
              {friendsCount > 2 && (
                <button
                  onClick={handleShowAllFriends}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  Show all frens
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <MembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        members={members}
        title={`All members of this ${getEntityName()}`}
        entityType={entityType}
      />

      <MembersModal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        members={friends}
        title={`All frens who are members of this ${getEntityName()}`}
        entityType={entityType}
      />

      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description={`Viewing all ${getEntityName()} ${getMembersLabel()} is available only with PRO subscription. Upgrade to PRO to unlock this feature.`}
      />
    </>
  );
}

