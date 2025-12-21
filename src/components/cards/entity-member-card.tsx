"use client";

import { Avatar, Badge, Button } from "@/components/ui";
import type { User } from "@/types";
import { UserCheck, Shield, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export type MemberRole = "owner" | "moderator" | "member";
export type MemberPermission = "Full access" | "Manage members" | "-";

interface EntityMemberCardProps {
  user: User;
  role: MemberRole;
  permissions: MemberPermission;
  isCurrentUser?: boolean;
  onRoleChange?: (userId: string, newRole: MemberRole) => void;
  onRemove?: (userId: string) => void;
  onPromote?: (userId: string) => void;
  className?: string;
}

const roleLabels: Record<MemberRole, string> = {
  owner: "Owner",
  moderator: "Moderator",
  member: "Member",
};

const roleIcons: Record<MemberRole, typeof Crown> = {
  owner: Crown,
  moderator: Shield,
  member: UserCheck,
};

const permissionLabels: Record<MemberPermission, string> = {
  "Full access": "Full access",
  "Manage members": "Manage members",
  "-": "-",
};

export function EntityMemberCard({
  user,
  role,
  permissions,
  isCurrentUser = false,
  onRoleChange,
  onRemove,
  onPromote,
  className,
}: EntityMemberCardProps) {
  const RoleIcon = roleIcons[role];

  const availableActions = [];
  
  if (!isCurrentUser) {
    if (role === "owner") {
      // Владелец - нельзя менять (но можно удалить, если это не текущий пользователь)
      // На самом деле владельца нельзя удалить через UI, так что без действий
    } else if (role === "moderator") {
      // Модератор - можно изменить роль или удалить
      if (onRoleChange) {
        availableActions.push({
          label: "Change role",
          onClick: () => {
            // Можно понизить до member или повысить до owner
            // Пока упростим - просто понижение
            onRoleChange(user.id, "member");
          },
        });
      }
      if (onRemove) {
        availableActions.push({
          label: "Remove from community",
          onClick: () => onRemove(user.id),
          variant: "destructive" as const,
        });
      }
    } else {
      // Member - можно повысить до модератора или удалить
      if (onPromote) {
        availableActions.push({
          label: "Promote to moderator",
          onClick: () => onPromote(user.id),
        });
      }
      if (onRemove) {
        availableActions.push({
          label: "Remove from community",
          onClick: () => onRemove(user.id),
          variant: "destructive" as const,
        });
      }
    }
  }

  return (
    <div
      className={cn(
        "bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar
            src={user.avatar_url}
            alt={user.twitter_name}
            size="lg"
            isVip={user.subscription_tier === "vip"}
            isVerified={user.is_verified}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
                {isCurrentUser ? "You" : user.twitter_name}
              </h3>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                <RoleIcon className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">
                  Role: <span className="font-medium">{roleLabels[role]}</span>
                </span>
              </div>
            </div>
            <div className="text-sm text-[var(--color-text-secondary)] mb-3">
              Permissions: <span className="font-medium">{permissionLabels[permissions]}</span>
            </div>
            {/* Actions List */}
            {availableActions.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Actions:</p>
                <ul className="space-y-1">
                  {availableActions.map((action, index) => (
                    <li key={index}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick();
                        }}
                        className={cn(
                          "text-xs text-left text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-2",
                          action.variant === "destructive" && "text-red-500 hover:text-red-600"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                        {action.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

