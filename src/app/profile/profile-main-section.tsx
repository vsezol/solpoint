"use client";

import { useState } from "react";
import { Button, Avatar } from "@/components/ui";
import { 
  Twitter, 
  Instagram, 
  Facebook, 
  Wallet, 
  LogOut, 
  MapPin, 
  Users,
  Camera
} from "lucide-react";
import { ProfileEditForm } from "./profile-edit-form";
import { useProfileEdit } from "./profile-edit-provider";
import type { User } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface ProfileMainSectionProps {
  user: User;
  isOwnProfile: boolean;
  friendsCount?: number;
}

export function ProfileMainSection({ user, isOwnProfile, friendsCount = 0 }: ProfileMainSectionProps) {
  const { isEditing, setIsEditing } = useProfileEdit();
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [isOpenToMeet, setIsOpenToMeet] = useState(user.is_open_to_meet);

  const handleUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setIsOpenToMeet(updatedUser.is_open_to_meet);
  };

  const handleToggleOpenToMeet = async () => {
    const newValue = !isOpenToMeet;
    setIsOpenToMeet(newValue);
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ is_open_to_meet: newValue })
        .eq("id", user.id);

      if (error) throw error;

      setCurrentUser({ ...currentUser, is_open_to_meet: newValue });
    } catch (error) {
      console.error("Error updating open to meet:", error);
      setIsOpenToMeet(!newValue); // Revert on error
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Banner */}
      <div className="relative h-48 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl overflow-hidden">
        {isOwnProfile && (
          <button
            className="absolute top-3 right-3 p-2 rounded-lg bg-black/50 hover:bg-black/70 transition-colors"
            onClick={() => {
              // TODO: Implement banner upload
              alert("Banner upload coming soon");
            }}
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Profile Header */}
      <div className="flex items-start justify-between -mt-20 relative z-10">
        <div className="ml-[18px] rounded-full overflow-hidden border-4 border-[var(--color-background)]">
          <Avatar
            src={currentUser.avatar_url}
            alt={currentUser.twitter_name}
            size="xl"
            isVip={currentUser.subscription_tier === "vip"}
            isVerified={currentUser.is_verified}
          />
        </div>
        {isOwnProfile && (
          <div className="mr-[14px]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              Edit profile
            </Button>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
            {currentUser.twitter_name}
          </h1>
          <p className="text-[var(--color-text-muted)]">
            @{currentUser.twitter_handle}
          </p>
        </div>

        {/* Role */}
        {currentUser.role && (
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <Users className="w-4 h-4" />
            <span className="capitalize">{currentUser.role}</span>
          </div>
        )}

        {/* Location */}
        {(currentUser.city || currentUser.country || (currentUser as any).countries?.name) && (
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <MapPin className="w-4 h-4" />
            <span>
              {currentUser.city && `${currentUser.city}, `}
              {(currentUser as any).countries?.name || currentUser.country || "Not specified"}
            </span>
          </div>
        )}

        {/* Bio */}
        {currentUser.bio && (
          <p className="text-[var(--color-text-secondary)]">
            {currentUser.bio}
          </p>
        )}

        {/* Friends count */}
        <p className="text-[var(--color-text-secondary)]">
          {friendsCount} {friendsCount === 1 ? "fren" : "frens"}
        </p>
      </div>

      {/* Edit Form or View */}
      {isEditing ? (
        <ProfileEditForm 
          user={currentUser} 
          onCancel={() => setIsEditing(false)}
          onUpdate={handleUpdate}
        />
      ) : (
        <>
          {/* Wallet */}
          {isOwnProfile && (
            <div className="w-fit">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-medium text-[var(--color-text-muted)]">
                  Wallet
                </h3>
                {currentUser.wallet_address ? (
                  <p className="text-sm font-mono text-[var(--color-text-secondary)] truncate max-w-[200px]">
                    {currentUser.wallet_address}
                  </p>
                ) : (
                  <Button variant="outline" size="sm">
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect wallet
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Socials */}
          <div className="w-fit">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-medium text-[var(--color-text-muted)]">
                Socials
              </h3>
              <div className="flex gap-2">
                <a
                  href={`https://twitter.com/${currentUser.twitter_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                {currentUser.socials?.instagram && (
                  <a
                    href={currentUser.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label="Instagram"
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
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Open to meet and Logout */}
          {isOwnProfile && (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  Open to meet:
                </span>
                <button
                  onClick={handleToggleOpenToMeet}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] ${
                    isOpenToMeet
                      ? "bg-green-500"
                      : "bg-[var(--color-surface-border)]"
                  }`}
                  aria-label={isOpenToMeet ? "Open to meet" : "Not open to meet"}
                  aria-checked={isOpenToMeet}
                  role="switch"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isOpenToMeet ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <form action="/api/auth/logout" method="POST">
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-surface-border)]"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </Button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

