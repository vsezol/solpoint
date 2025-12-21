"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui";
import { EntityMemberCard } from "@/components/cards";
import { Users, ChevronDown, ChevronUp } from "lucide-react";
import type { User, MemberRole } from "@/components/cards";

interface EntityMembersListProps {
  members: (User & { joined_at?: string; role?: "owner" | "member" })[];
  creator: User;
  entityId: string;
  entityType: "hub" | "community" | "project" | "workspace";
  currentUserId: string;
}

const INITIAL_MEMBERS_SHOWN = 5;

export function EntityMembersList({
  members,
  creator,
  entityId,
  entityType,
  currentUserId,
}: EntityMembersListProps) {
  const [showAllMembers, setShowAllMembers] = useState(false);

  // Сортируем: сначала owner, потом остальные
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (a.role !== "owner" && b.role === "owner") return 1;
    return 0;
  });

  // Отделяем участников с ролями (owner) и обычных участников
  const membersWithRoles = sortedMembers.filter((m) => m.role === "owner");
  const regularMembers = sortedMembers.filter((m) => m.role !== "owner");

  const membersToShow = showAllMembers
    ? regularMembers
    : regularMembers.slice(0, INITIAL_MEMBERS_SHOWN);
  const hasMoreMembers = regularMembers.length > INITIAL_MEMBERS_SHOWN;

  const handlePromote = async (userId: string) => {
    // TODO: Реализовать API для повышения до модератора
    console.log("Promote user:", userId);
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    try {
      let endpoint = "";
      if (entityType === "hub") {
        endpoint = `/api/hubs/${entityId}/members/${userId}`;
      } else if (entityType === "community") {
        endpoint = `/api/communities/${entityId}/members/${userId}`;
      } else if (entityType === "project" || entityType === "workspace") {
        endpoint = `/api/projects/${entityId}/members/${userId}`;
      }

      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove member");
      }

      // Перезагружаем страницу
      window.location.reload();
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member. Please try again.");
    }
  };

  return (
    <Card variant="bordered">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Members ({members.length})
          </h2>
        </div>
        {hasMoreMembers && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllMembers(!showAllMembers)}
          >
            {showAllMembers ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Hide all members
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Show all
              </>
            )}
          </Button>
        )}
      </div>

      {/* Members with roles (Owner, Moderator, etc.) */}
      {membersWithRoles.length > 0 && (
        <div className="space-y-3 mb-6">
          {membersWithRoles.map((member) => (
            <EntityMemberCard
              key={member.id}
              user={member}
              role={(member.role || "member") as MemberRole}
              permissions={member.role === "owner" ? "Full access" : "Manage members"}
              isCurrentUser={member.id === currentUserId}
              onRemove={member.role !== "owner" ? handleRemove : undefined}
              onPromote={undefined}
            />
          ))}
        </div>
      )}

      {/* Regular members */}
      <div className="space-y-3">
        {membersToShow.map((member) => (
          <EntityMemberCard
            key={member.id}
            user={member}
            role="member"
            permissions="-"
            isCurrentUser={member.id === currentUserId}
            onRemove={handleRemove}
            onPromote={handlePromote}
          />
        ))}
      </div>

      {regularMembers.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
          No members yet
        </p>
      )}
    </Card>
  );
}

