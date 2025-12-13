"use client";

import { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import { Twitter, Instagram, Facebook, Wallet, LogOut } from "lucide-react";
import { ProfileView } from "./profile-view";
import { ProfileEditForm } from "./profile-edit-form";
import { useProfileEdit } from "./profile-edit-provider";
import type { User } from "@/types";

interface ProfileInfoSectionProps {
  user: User;
  isOwnProfile: boolean;
}

export function ProfileInfoSection({ user, isOwnProfile }: ProfileInfoSectionProps) {
  const { isEditing, setIsEditing } = useProfileEdit();
  const [currentUser, setCurrentUser] = useState<User>(user);

  // Обновляем локальное состояние при изменении user prop
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const handleUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Bio and Details - Editable section */}
      {isEditing ? (
        <ProfileEditForm 
          user={currentUser} 
          onCancel={() => setIsEditing(false)}
          onUpdate={handleUpdate}
        />
      ) : (
        <ProfileView user={currentUser} />
      )}

      {/* Socials - только просмотр */}
      <Card variant="bordered">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
          Socials
        </h3>
        <div className="flex gap-2">
          <a
            href={`https://twitter.com/${currentUser.twitter_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Twitter className="w-5 h-5" />
          </a>
          {currentUser.socials?.instagram && (
            <a
              href={currentUser.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
          )}
          {currentUser.socials?.facebook && (
            <a
              href={currentUser.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Facebook className="w-5 h-5" />
            </a>
          )}
        </div>
      </Card>

      {/* Wallet - только для своего профиля */}
      {isOwnProfile && (
        <Card variant="bordered">
          <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
            Wallet
          </h3>
          {currentUser.wallet_address ? (
            <p className="text-sm font-mono text-[var(--color-text-secondary)] truncate">
              {currentUser.wallet_address}
            </p>
          ) : (
            <Button variant="outline" size="sm" className="w-full">
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          )}
        </Card>
      )}

      {/* Logout button - только для своего профиля */}
      {isOwnProfile && (
        <Card variant="bordered">
          <form action="/api/auth/logout" method="POST">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full text-red-500 hover:text-red-600 hover:border-red-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

