"use client";

import type { ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, Button } from "@/components/ui";
import { Calendar, Camera, Loader2, LogOut, MapPin, Users, X } from "lucide-react";
import type { Event, User } from "@/types";
import type { FriendshipStatus, ProfileAffiliation } from "@/types/profile";
import { getEntityLink } from "@/lib/utils/entity-links";
import { ProfileEditForm } from "../profile-edit-form";
import { AddFriendButton } from "../add-friend-button";
import { EditProfileButton } from "../edit-profile-button";
import { ProfileSocialLinks } from "./profile-social-links";
import { USER_ROLE_LABELS } from "@/lib/profile-taxonomy";

interface ProfileMainColumnProps {
  user: User;
  currentUser: User;
  isOwnProfile: boolean;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;

  friendshipStatus: FriendshipStatus;
  friendsStats: { friendsCount: number; friendRequestsCount: number };
  friendsCount: number;
  loadingUserFriends: boolean;

  affiliations: ProfileAffiliation[];
  isLoadingAffiliations: boolean;

  isUploadingBanner: boolean;
  isOpenToMeet: boolean;

  onBannerUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onBannerDelete: () => Promise<void>;
  onShowFriendsList: () => Promise<void>;
  onShowFriendRequestsList: () => Promise<void>;
  onShowUserFriendsList: () => Promise<void>;
  onShowAffiliationsList: () => Promise<void>;
  onAddEntityClick: () => void;
  onToggleOpenToMeet: () => Promise<void>;
  onUpdate: (updatedUser: User) => void;
}

const formatEventDate = (startDate: string, endDate?: string, timezone?: string) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  const formatDate = (date: Date, includeTime = false) => {
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    if (includeTime) {
      const timeStr = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
      });

      if (timezone) {
        const offset = date.getTimezoneOffset();
        const hours = Math.floor(Math.abs(offset) / 60);
        const sign = offset <= 0 ? "+" : "-";
        return `${dateStr}, ${timeStr} (GMT ${sign}${hours})`;
      }

      return `${dateStr}, ${timeStr}`;
    }

    return dateStr;
  };

  if (end && start.toDateString() !== end.toDateString()) {
    return `${formatDate(start)}-${formatDate(end)}`;
  }

  const hasTime = start.getHours() !== 0 || start.getMinutes() !== 0;
  return formatDate(start, hasTime);
};

export function ProfileMainColumn({
  user,
  currentUser,
  isOwnProfile,
  isEditing,
  setIsEditing,
  friendshipStatus,
  friendsStats,
  friendsCount,
  loadingUserFriends,
  affiliations,
  isLoadingAffiliations,
  isUploadingBanner,
  isOpenToMeet,
  onBannerUpload,
  onBannerDelete,
  onShowFriendsList,
  onShowFriendRequestsList,
  onShowUserFriendsList,
  onShowAffiliationsList,
  onAddEntityClick,
  onToggleOpenToMeet,
  onUpdate,
}: ProfileMainColumnProps) {
  return (
    <div className="flex-1 min-w-0 max-w-[600px] w-full">
      <div className="flex flex-col gap-6">
        <div className="relative h-48 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl overflow-hidden">
          {currentUser.banner_url && (
            <Image src={currentUser.banner_url} alt="Profile banner" fill className="object-cover" unoptimized />
          )}
          {isOwnProfile && (
            <div className="absolute top-3 right-3 flex gap-2">
              <input
                type="file"
                id="banner-upload"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onBannerUpload}
                disabled={isUploadingBanner}
              />
              <label
                htmlFor="banner-upload"
                className={`group p-2 rounded-lg bg-black/70 text-white border-white/30 backdrop-blur-md shadow-2xl hover:bg-black/90 hover:border-white/50 hover:scale-105 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] active:scale-100 transition-all duration-200 ${
                  isUploadingBanner ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
                style={{
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
                }}
              >
                {isUploadingBanner ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
                )}
              </label>
              {currentUser.banner_url && (
                <button
                  onClick={onBannerDelete}
                  disabled={isUploadingBanner}
                  className={`group p-2 rounded-lg bg-black/70 text-white border-white/30 backdrop-blur-md shadow-2xl hover:bg-black/90 hover:border-white/50 hover:scale-105 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] active:scale-100 transition-all duration-200 cursor-pointer ${
                    isUploadingBanner ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  style={{
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                    textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
                  }}
                  title="Remove banner"
                >
                  <X className="w-4 h-4 text-white transition-transform duration-200 group-hover:scale-110 group-hover:rotate-90" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-start justify-between -mt-20 relative z-10">
          <Avatar
            src={currentUser.avatar_url}
            alt={currentUser.twitter_name}
            size="xl"
            isVerified={currentUser.is_verified}
            className="ml-[18px] ring-4 ring-[var(--color-background)]"
          />
          {!isOwnProfile && (
            <div className="mr-[14px]">
              <AddFriendButton userId={user.id} userHandle={user.twitter_handle} initialStatus={friendshipStatus} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{currentUser.twitter_name}</h1>
                <p className="text-[var(--color-text-muted)]">@{currentUser.twitter_handle}</p>
              </div>
              {isOwnProfile && (
                <div className="mb-auto">
                  <EditProfileButton />
                </div>
              )}
            </div>
          </div>

          {currentUser.role && (
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
              <Users className="w-4 h-4" />
              <span>{USER_ROLE_LABELS[currentUser.role] || currentUser.role}</span>
            </div>
          )}

          {(currentUser.city || currentUser.country || (currentUser as User & { countries?: { name: string } })?.countries?.name) && (
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
              <MapPin className="w-4 h-4" />
              <span>
                {currentUser.city && `${currentUser.city}, `}
                {(currentUser as User & { countries?: { name: string } })?.countries?.name || currentUser.country ||
                  "Not specified"}
              </span>
            </div>
          )}

          {currentUser.bio && <p className="text-[var(--color-text-secondary)]">{currentUser.bio}</p>}

          {isOwnProfile ? (
            <div className="flex gap-[10px] items-center">
              <button
                onClick={onShowFriendsList}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
              >
                <span className="font-bold">{friendsStats.friendsCount}</span>{" "}
                {friendsStats.friendsCount === 1 ? "fren" : "frens"}
              </button>
              {friendsStats.friendRequestsCount > 0 && (
                <button
                  onClick={onShowFriendRequestsList}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                >
                  <span className="font-bold">{friendsStats.friendRequestsCount}</span> fren{" "}
                  {friendsStats.friendRequestsCount === 1 ? "request" : "requests"}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onShowUserFriendsList}
              disabled={loadingUserFriends}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer text-left flex items-center gap-2"
            >
              {loadingUserFriends ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {friendsCount} {friendsCount === 1 ? "fren" : "frens"}
                  </span>
                </>
              ) : (
                <span>
                  {friendsCount} {friendsCount === 1 ? "fren" : "frens"}
                </span>
              )}
            </button>
          )}

          <div className="space-y-3">
            {isLoadingAffiliations ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-[var(--color-surface-hover)] rounded w-32 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] animate-pulse"
                      />
                    ))}
                  </div>
                  <div className="h-4 bg-[var(--color-surface-hover)] rounded w-16 ml-auto animate-pulse"></div>
                </div>
                {isOwnProfile && (
                  <div className="pt-4 border-t border-[var(--color-surface-border)]">
                    <div className="h-4 bg-[var(--color-surface-hover)] rounded w-40 mb-3 animate-pulse"></div>
                    <div className="h-9 bg-[var(--color-surface-hover)] rounded w-48 animate-pulse"></div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg text-[var(--color-text-primary)]">
                    <span className="font-bold">{affiliations.length}</span>{" "}
                    <span className="text-[var(--color-text-secondary)] font-normal">Affiliations</span>
                  </h3>
                </div>
                {affiliations.length > 0 ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center -space-x-2">
                      {affiliations.slice(0, 3).map((affiliation) => (
                        <Link
                          key={affiliation.id}
                          href={getEntityLink({ type: affiliation.type, slug: affiliation.slug, id: affiliation.id })}
                          className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden hover:z-10 transition-transform hover:scale-110"
                        >
                          {affiliation.image_url ? (
                            <Image
                              src={affiliation.image_url}
                              alt={affiliation.name}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                              {affiliation.name?.[0]?.toUpperCase() || "?"}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                    <button
                      onClick={onShowAffiliationsList}
                      className="text-sm text-[var(--color-primary)] hover:underline ml-auto cursor-pointer"
                    >
                      Show list
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-secondary)]">No affiliations yet</p>
                )}
                {isOwnProfile && (
                  <div className="pt-4 border-t border-[var(--color-surface-border)]">
                    <p className="text-sm text-[var(--color-text-secondary)] mb-3">Founder or organizer?</p>
                    <Button variant="primary" size="sm" className="w-fit" onClick={onAddEntityClick}>
                      Add your project to the map
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <ProfileEditForm user={currentUser} onCancel={() => setIsEditing(false)} onUpdate={onUpdate} />
        ) : (
          <>
            <ProfileSocialLinks user={currentUser} />

            {isOwnProfile && (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">Open to meet:</span>
                  <button
                    onClick={onToggleOpenToMeet}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] ${
                      isOpenToMeet ? "bg-green-500" : "bg-[var(--color-surface-border)]"
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
    </div>
  );
}

export function ProfileUpcomingEventsPreview({ upcomingEvents }: { upcomingEvents: Event[] }) {
  return (
    <>
      {upcomingEvents.length > 0 ? (
        <div className="space-y-3">
          {upcomingEvents.slice(0, 3).map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.slug || event.id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
                {event.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.image_url} alt={event.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{event.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {formatEventDate(event.start_date, event.end_date, (event as Event & { timezone?: string }).timezone)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No upcoming events</p>
      )}
    </>
  );
}
