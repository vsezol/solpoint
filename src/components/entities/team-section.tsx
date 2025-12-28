"use client";

import { UserCard } from "@/components/cards/user-card";
import { Card } from "@/components/ui";
import type { User } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface TeamMember extends User {
  role?: "owner" | "moderator" | "member";
}

interface TeamSectionProps {
  teamMembers: TeamMember[];
  isVip: boolean;
  currentUserId?: string;
  entityType: "hub" | "community" | "project" | "workspace" | "event";
  title?: string; // "Team" для хабов/комьюнити/проектов, "Hosts" для ивентов
}

export function TeamSection({
  teamMembers,
  isVip,
  currentUserId,
  entityType,
  title = "Team",
}: TeamSectionProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Фильтруем только owners и moderators
  const filteredTeam = teamMembers.filter(
    (member) => member.role === "owner" || member.role === "moderator"
  );

  if (filteredTeam.length === 0) {
    return null;
  }

  const handleProfileClick = (e: React.MouseEvent<HTMLAnchorElement>, userId: string) => {
    if (!isAuthenticated) {
      e.preventDefault();
      router.push("/login");
      return;
    }
    if (isAuthenticated && !isVip) {
      e.preventDefault();
      // Можно показать модальное окно для VIP
      return;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
        {title}
      </h2>
      <div className="space-y-4">
        {filteredTeam.map((member) => (
          <div key={member.id} className="w-fit max-w-md">
            <UserCard
              user={member}
              isVip={isVip}
              compact={false}
              currentUserId={currentUserId}
              onProfileClick={(e) => handleProfileClick(e, member.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

