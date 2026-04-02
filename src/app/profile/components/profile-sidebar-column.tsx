"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, Check, Crown, Loader2, UserPlus } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { Event, User } from "@/types";
import type { CanRequestMeetingSharedEvent } from "@/lib/api/meeting-requests";
import { ProfileUpcomingEventsPreview } from "./profile-main-column";
import { ProfileQrCard } from "./profile-qr-card";

interface ProfileSidebarColumnProps {
  user: User;
  isOwnProfile: boolean;
  profileQrEnabled?: boolean;

  totalUsers: number;
  usersInCountry: number;
  usersInCity: number;
  loadingUsers: boolean;
  loadUsersList: (filter: "all" | "country" | "city") => Promise<void>;

  mutualFollowers: User[];
  isCheckingPro: boolean;
  onShowMutualsList: () => Promise<void>;

  isLoadingInvite: boolean;
  isGeneratingInvite: boolean;
  isCopied: boolean;
  onCopyInviteLink: () => Promise<void>;

  upcomingEvents: Event[];

  meetingRequestsEnabled: boolean;
  canRequestMeeting: boolean | null;
  sharedEventsForMeeting: CanRequestMeetingSharedEvent[];
  onOpenProfileMeetingRequest: () => void;

  isLoadingMeetingRequests: boolean;
  actionNeededMeetingRequestsCount: number;
  upcomingMeetingRequestsCount: number;
  onOpenMeetingCalendarModal: () => Promise<void>;
  onOpenMeetingRequestsModal: () => Promise<void>;
}

export function ProfileSidebarColumn({
  user,
  isOwnProfile,
  profileQrEnabled = true,
  totalUsers,
  usersInCountry,
  usersInCity,
  loadingUsers,
  loadUsersList,
  mutualFollowers,
  isCheckingPro,
  onShowMutualsList,
  isLoadingInvite,
  isGeneratingInvite,
  isCopied,
  onCopyInviteLink,
  upcomingEvents,
  meetingRequestsEnabled,
  canRequestMeeting,
  sharedEventsForMeeting,
  onOpenProfileMeetingRequest,
  isLoadingMeetingRequests,
  actionNeededMeetingRequestsCount,
  upcomingMeetingRequestsCount,
  onOpenMeetingCalendarModal,
  onOpenMeetingRequestsModal,
}: ProfileSidebarColumnProps) {
  return (
    <div className="w-full md:w-[557px] flex-shrink-0">
      <div className="flex flex-col gap-6 w-full">
        {isOwnProfile && profileQrEnabled && <ProfileQrCard userHandle={user.twitter_handle} />}

        <Card variant="bordered" className="w-full">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">SolPoint users</h3>
          <div className="space-y-3 mb-4">
            <div>
              <button
                onClick={() => loadUsersList("all")}
                disabled={loadingUsers}
                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer w-full text-left"
              >
                Total users on SolPoint:{" "}
                <span className="text-[var(--color-text-primary)] font-medium">{totalUsers.toLocaleString()}</span>
              </button>
            </div>
            <div>
              <button
                onClick={() => loadUsersList("country")}
                disabled={loadingUsers}
                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer w-full text-left"
              >
                Users in your country:{" "}
                <span className="text-[var(--color-text-primary)] font-medium">{usersInCountry.toLocaleString()}</span>
              </button>
            </div>
            <div>
              <button
                onClick={() => loadUsersList("city")}
                disabled={loadingUsers}
                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer w-full text-left"
              >
                Users in your city:{" "}
                <span className="text-[var(--color-text-primary)] font-medium">{usersInCity.toLocaleString()}</span>
              </button>
            </div>
          </div>

          <div className="mb-4 pt-4 border-t border-[var(--color-surface-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Your mutuals</h3>
            {mutualFollowers.length > 0 ? (
              <>
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                  <span className="text-[var(--color-text-primary)] font-medium">{mutualFollowers.length}</span>{" "}
                  {mutualFollowers.length === 1 ? "person you follow on Twitter is" : "people you follow on Twitter are"}{" "}
                  on SolPoint
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center -space-x-2">
                    {mutualFollowers.slice(0, 3).map((follower) => (
                      <Link
                        key={follower.id}
                        href={`/profile/${follower.twitter_handle}`}
                        className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden hover:z-10 transition-transform hover:scale-110"
                      >
                        {follower.avatar_url ? (
                          <Image
                            src={follower.avatar_url}
                            alt={follower.twitter_name}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                            {follower.twitter_name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                  {mutualFollowers.length > 3 && (
                    <button
                      onClick={onShowMutualsList}
                      className="text-sm text-[var(--color-primary)] hover:underline ml-auto"
                      disabled={isCheckingPro}
                    >
                      Show list
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                <span className="text-[var(--color-text-primary)] font-medium">0</span> Mutuals
              </p>
            )}
            {isOwnProfile && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--color-text-secondary)]">Invite friends</span>
                <Button
                  onClick={onCopyInviteLink}
                  variant={isCopied ? "secondary" : "primary"}
                  size="sm"
                  className="whitespace-nowrap"
                  isLoading={isLoadingInvite || isGeneratingInvite}
                  disabled={isLoadingInvite || isGeneratingInvite}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Generate Invite Link
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card variant="bordered" className="w-full">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">What&apos;s happening</h3>
          <ProfileUpcomingEventsPreview upcomingEvents={upcomingEvents} />
        </Card>

        {!isOwnProfile && meetingRequestsEnabled && (
          <>
            {canRequestMeeting === null ? (
              <Card variant="bordered" className="w-full">
                <div className="animate-pulse space-y-3">
                  <div className="h-5 bg-[var(--color-surface-hover)] rounded w-2/3" />
                  <div className="h-4 bg-[var(--color-surface-hover)] rounded w-full" />
                  <div className="h-9 bg-[var(--color-surface-hover)] rounded w-full" />
                </div>
              </Card>
            ) : canRequestMeeting && sharedEventsForMeeting.length > 0 ? (
              <Card variant="bordered" className="w-full">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Invite to meet</h3>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  You&apos;re both attending the same upcoming event{sharedEventsForMeeting.length > 1 ? "s" : ""}. Request a
                  meeting.
                </p>
                <Button variant="primary" size="sm" onClick={onOpenProfileMeetingRequest}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Request meeting
                </Button>
              </Card>
            ) : null}
          </>
        )}

        {isOwnProfile && meetingRequestsEnabled && (
          <Card variant="bordered" className="w-full">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Your meetups</h3>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  New requests:{" "}
                  <span className="text-[var(--color-text-primary)] font-semibold inline-flex items-center min-w-4">
                    {isLoadingMeetingRequests ? <Loader2 className="w-4 h-4 animate-spin" /> : actionNeededMeetingRequestsCount}
                  </span>
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Upcoming meetups:{" "}
                  <span className="text-[var(--color-text-primary)] font-semibold inline-flex items-center min-w-4">
                    {isLoadingMeetingRequests ? <Loader2 className="w-4 h-4 animate-spin" /> : upcomingMeetingRequestsCount}
                  </span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" onClick={onOpenMeetingCalendarModal}>
                  Open Calendar
                </Button>
                <Button variant="primary" size="sm" onClick={onOpenMeetingRequestsModal}>
                  Check meeting requests
                </Button>
              </div>
            </div>
          </Card>
        )}

        {user.subscription_tier === "free" && (
          <Card variant="bordered" className="w-full bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Upgrade to PRO</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">See cities, profiles, send messages, and more</p>
            <Button asChild variant="primary" size="sm" className="w-full">
              <Link href="/subscription">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
