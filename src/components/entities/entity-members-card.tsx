"use client";

import { Card } from "@/components/ui";
import { MembersList } from "@/components/ui/members-list";
import type { User } from "@/types";

interface EntityMembersCardProps {
  members: (User & { joined_at?: string })[];
  friends?: User[];
  isVip: boolean;
  authUser: { id: string } | null;
  entitySlug: string;
  entityType: "hub" | "community" | "project" | "workspace";
  entityName: string;
}

export function EntityMembersCard({ 
  members, 
  friends = [],
  isVip, 
  authUser, 
  entitySlug,
  entityType,
  entityName 
}: EntityMembersCardProps) {
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
      default:
        return `/${entityType}s/${slug}`;
    }
  };

  return (
    <Card variant="bordered">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
        Members on SolPoint
      </h3>
      <div className="space-y-6">
        {/* All Members */}
        <MembersList
          title={`${members.length} ${members.length === 1 ? "person" : "people"} are members of this ${entityName}`}
          items={members.map((member) => ({
            id: member.id,
            avatar_url: member.avatar_url,
            name: member.twitter_name,
            twitter_handle: member.twitter_handle,
            isVip: member.subscription_tier === "vip",
            isVerified: member.is_verified,
          }))}
          showAllText="Show all members"
          showAllHref={`${getEntityPath(entitySlug)}?tab=members`}
          emptyText="No members yet"
          entitySlug={entitySlug}
          entityType={entityType}
          isFriendsList={false}
        />

        {/* Friends */}
        {authUser && friends.length > 0 && (
          <MembersList
            title={`${friends.length} ${friends.length === 1 ? "fren" : "frens"} are members of this ${entityName}`}
            items={friends.map((friend) => ({
              id: friend.id,
              avatar_url: friend.avatar_url,
              name: friend.twitter_name,
              twitter_handle: friend.twitter_handle,
              isVip: friend.subscription_tier === "vip",
              isVerified: friend.is_verified,
            }))}
            showAllText="Show all frens"
            showAllHref={`${getEntityPath(entitySlug)}?tab=members`}
            emptyText="No friends yet"
            entitySlug={entitySlug}
            entityType={entityType}
            isFriendsList={true}
          />
        )}
      </div>
    </Card>
  );
}

