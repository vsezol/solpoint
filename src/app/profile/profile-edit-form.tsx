"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import type { User, UserRole } from "@/types";

const ROLES: UserRole[] = [
  "degen",
  "developer",
  "trader",
  "investor",
  "designer",
  "founder",
  "other",
];

interface ProfileEditFormProps {
  user: User;
  onCancel: () => void;
  onUpdate?: (updatedUser: User) => void;
}

export function ProfileEditForm({ user, onCancel, onUpdate }: ProfileEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [bio, setBio] = useState(user.bio || "");
  const [role, setRole] = useState<UserRole>(user.role || "degen");
  const [isOpenToMeet, setIsOpenToMeet] = useState(user.is_open_to_meet || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bio: bio.trim() || null,
          role,
          is_open_to_meet: isOpenToMeet,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      // Обновляем локальное состояние, если callback передан
      if (onUpdate && data.profile) {
        onUpdate(data.profile);
      }

      // Инвалидируем кэш профиля
      queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
      
      // Обновляем server component данные
      router.refresh();
      
      // Закрываем форму редактирования
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const bioLength = bio.length;
  const maxBioLength = 150;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Bio */}
      <Card variant="bordered">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
          About
        </h3>
        <div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={maxBioLength}
            rows={4}
            placeholder="Tell us about yourself..."
            className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)] text-right">
            {bioLength}/{maxBioLength}
          </p>
        </div>
      </Card>

      {/* Details */}
      <Card variant="bordered">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
          Details
        </h3>
        <div className="space-y-4">
          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] transition-colors focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Is Open to Meet */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_open_to_meet"
              checked={isOpenToMeet}
              onChange={(e) => setIsOpenToMeet(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--color-surface-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-2"
            />
            <label
              htmlFor="is_open_to_meet"
              className="text-sm text-[var(--color-text-primary)] cursor-pointer"
            >
              Open to meet
            </label>
          </div>
        </div>
      </Card>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
          className="flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

