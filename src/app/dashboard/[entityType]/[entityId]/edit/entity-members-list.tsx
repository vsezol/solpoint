"use client";

import { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import { EntityMemberCard } from "@/components/cards";
import type { MemberRole } from "@/components/cards";
import { Users, ChevronDown, ChevronUp } from "lucide-react";
import type { User } from "@/types";

interface EntityMembersListProps {
  members: (User & { joined_at?: string; role?: "owner" | "moderator" | "member" })[];
  creator: User;
  entityId: string;
  entityType: "hub" | "community" | "project" | "workspace" | "event";
  currentUserId: string;
}

const INITIAL_MEMBERS_SHOWN = 5;

export function EntityMembersList({
  members: initialMembers,
  entityId,
  entityType,
  currentUserId,
}: EntityMembersListProps) {
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [members, setMembers] = useState(initialMembers);

  // Синхронизируем состояние с пропсами при изменении
  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  // Сортируем: сначала owner, потом moderator, потом member
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder: Record<string, number> = { owner: 0, moderator: 1, member: 2 };
    const aOrder = roleOrder[a.role || "member"] ?? 2;
    const bOrder = roleOrder[b.role || "member"] ?? 2;
    return aOrder - bOrder;
  });

  // Отделяем участников с ролями (owner, moderator) и обычных участников
  const membersWithRoles = sortedMembers.filter((m) => m.role === "owner" || m.role === "moderator");
  const regularMembers = sortedMembers.filter((m) => m.role === "member" || !m.role);

  const membersToShow = showAllMembers
    ? regularMembers
    : regularMembers.slice(0, INITIAL_MEMBERS_SHOWN);
  const hasMoreMembers = regularMembers.length > INITIAL_MEMBERS_SHOWN;

  const handlePromote = async (userId: string) => {
    // Оптимистичное обновление UI
    setMembers((prevMembers) =>
      prevMembers.map((member) =>
        member.id === userId ? { ...member, role: "moderator" } : member
      ) as typeof prevMembers
    );

    try {
      let endpoint = "";
      if (entityType === "hub") {
        endpoint = `/api/hubs/${entityId}/members/${userId}/role`;
      } else if (entityType === "community") {
        endpoint = `/api/communities/${entityId}/members/${userId}/role`;
      } else if (entityType === "project" || entityType === "workspace") {
        endpoint = `/api/projects/${entityId}/members/${userId}/role`;
      } else if (entityType === "event") {
        endpoint = `/api/events/${entityId}/members/${userId}/role`;
      }

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "moderator" }),
      });

      if (!response.ok) {
        const data = await response.json();
        // Откатываем изменения при ошибке
        setMembers(initialMembers);
        throw new Error(data.error || "Failed to promote member");
      }
    } catch (error) {
      console.error("Error promoting member:", error);
      alert(error instanceof Error ? error.message : "Failed to promote member. Please try again.");
      // Откатываем изменения при ошибке
      setMembers(initialMembers);
    }
  };

  const handleDemote = async (userId: string) => {
    if (!confirm("Are you sure you want to demote this moderator to a regular member?")) {
      return;
    }

    // Оптимистичное обновление UI
    setMembers((prevMembers) =>
      prevMembers.map((member) =>
        member.id === userId ? { ...member, role: "member" } : member
      ) as typeof prevMembers
    );

    try {
      let endpoint = "";
      if (entityType === "hub") {
        endpoint = `/api/hubs/${entityId}/members/${userId}/role`;
      } else if (entityType === "community") {
        endpoint = `/api/communities/${entityId}/members/${userId}/role`;
      } else if (entityType === "project" || entityType === "workspace") {
        endpoint = `/api/projects/${entityId}/members/${userId}/role`;
      } else if (entityType === "event") {
        endpoint = `/api/events/${entityId}/members/${userId}/role`;
      }

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "member" }),
      });

      if (!response.ok) {
        const data = await response.json();
        // Откатываем изменения при ошибке
        setMembers(initialMembers);
        throw new Error(data.error || "Failed to demote member");
      }
    } catch (error) {
      console.error("Error demoting member:", error);
      alert(error instanceof Error ? error.message : "Failed to demote member. Please try again.");
      // Откатываем изменения при ошибке
      setMembers(initialMembers);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    // Оптимистичное обновление UI
    const memberToRemove = members.find((m) => m.id === userId);
    setMembers((prevMembers) => prevMembers.filter((member) => member.id !== userId));

    try {
      let endpoint = "";
      if (entityType === "hub") {
        endpoint = `/api/hubs/${entityId}/members/${userId}`;
      } else if (entityType === "community") {
        endpoint = `/api/communities/${entityId}/members/${userId}`;
      } else if (entityType === "project" || entityType === "workspace") {
        endpoint = `/api/projects/${entityId}/members/${userId}`;
      } else if (entityType === "event") {
        endpoint = `/api/events/${entityId}/members/${userId}`;
      }

      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Откатываем изменения при ошибке
        if (memberToRemove) {
          setMembers((prevMembers) => [...prevMembers, memberToRemove]);
        }
        throw new Error("Failed to remove member");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member. Please try again.");
      // Откатываем изменения при ошибке
      if (memberToRemove) {
        setMembers((prevMembers) => [...prevMembers, memberToRemove]);
      }
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
              onRoleChange={
                member.role === "moderator"
                  ? (userId: string, newRole: MemberRole) => {
                      if (newRole === "member") {
                        handleDemote(userId);
                      }
                    }
                  : undefined
              }
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

