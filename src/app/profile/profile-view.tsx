"use client";

import { Card, Badge } from "@/components/ui";
import { MapPin, Users } from "lucide-react";
import type { User } from "@/types";
import { USER_ROLE_LABELS } from "@/lib/profile-taxonomy";

interface ProfileViewProps {
  user: User;
}

export function ProfileView({ user }: ProfileViewProps) {
  const countryName =
    (user as User & { countries?: { name?: string } }).countries?.name ||
    user.country ||
    "Not specified";

  return (
    <>
      {/* Bio */}
      <Card variant="bordered">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
          About
        </h3>
        <p className="text-[var(--color-text-secondary)]">
          {user.bio || "No bio yet"}
        </p>
      </Card>

      {/* Details */}
      <Card variant="bordered">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
          Details
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
            <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
            <span>
              {user.city && `${user.city}, `}
              {countryName}
            </span>
          </div>
          {user.role && (
            <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
              <Users className="w-4 h-4 text-[var(--color-primary)]" />
              <span>{USER_ROLE_LABELS[user.role] || user.role}</span>
            </div>
          )}
          {user.is_open_to_meet && (
            <Badge variant="success">Open to meet</Badge>
          )}
        </div>
      </Card>
    </>
  );
}
