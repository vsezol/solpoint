"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthRequiredModal, ProSubscriptionModal } from "@/components/ui";
import { MeetingRequestForm } from "@/components/meeting-request-form";
import { AvatarListModal } from "@/components/users/avatar-list-modal";
import { UserListModal } from "@/components/users/user-list-modal";
import { useAuth } from "@/hooks/use-auth";
import { isMeetingRequestsEnabled } from "@/lib/meeting-requests";
import { trackEvent } from "@/lib/analytics";
import type { EntityType, User } from "@/types";
import { useProfileEdit } from "./profile-edit-provider";
import { useProfilePageData } from "./hooks/use-profile-page-data";
import { useProfileActions } from "./hooks/use-profile-actions";
import { useProfileDirectory } from "./hooks/use-profile-directory";
import { useProfileMeetingRequests } from "./hooks/use-profile-meeting-requests";
import { useProfileFriends } from "./hooks/use-profile-friends";
import { ProfileMainColumn } from "./components/profile-main-column";
import { ProfileSidebarColumn } from "./components/profile-sidebar-column";
import { ProfileAffiliationsModal } from "./components/profile-affiliations-modal";
import { ProfileCreateEntityModal } from "./components/profile-create-entity-modal";
import { ProfileFriendRequestsModal } from "./components/profile-friend-requests-modal";
import { MeetingCalendarModal } from "./components/meetings/meeting-calendar-modal";
import { MeetingDetailsModal } from "./components/meetings/meeting-details-modal";
import { MeetingRequestsModal } from "./components/meetings/meeting-requests-modal";

interface ProfileContentProps {
  user: User;
  isOwnProfile: boolean;
  profileQrEnabled?: boolean;
}

export function ProfileContent({ user, isOwnProfile, profileQrEnabled = true }: ProfileContentProps) {
  const { isEditing, setIsEditing } = useProfileEdit();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentAuthUser, isAuthenticated } = useAuth();
  const isVip = currentAuthUser?.subscription_tier === "vip";
  const meetingRequestsEnabled = isMeetingRequestsEnabled();

  const [currentUser, setCurrentUser] = useState<User>(user);
  const [isOpenToMeet, setIsOpenToMeet] = useState(user.is_open_to_meet);

  const [showProModal, setShowProModal] = useState(false);
  const [isMutualsModalOpen, setIsMutualsModalOpen] = useState(false);
  const [isAffiliationsModalOpen, setIsAffiliationsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEntityType, setCreateEntityType] = useState<EntityType>("hub");

  useEffect(() => {
    setCurrentUser(user);
    setIsOpenToMeet(user.is_open_to_meet);
  }, [user]);

  const pageData = useProfilePageData({ user, isOwnProfile });

  const profileActions = useProfileActions({
    isOwnProfile,
    setCurrentUser: (updater) => setCurrentUser((prev) => updater(prev)),
    isOpenToMeet,
    setIsOpenToMeet,
  });

  const directory = useProfileDirectory({
    user,
    isAuthenticated,
    isVip,
    hasCurrentAuthUser: Boolean(currentAuthUser),
  });

  const meetings = useProfileMeetingRequests({
    user,
    isOwnProfile,
    isAuthenticated,
    isVip,
    currentAuthUserId: currentAuthUser?.id || null,
    meetingRequestsEnabled,
    searchParams,
    push: (href) => router.push(href),
    onRequirePro: () => setShowProModal(true),
  });

  const friends = useProfileFriends({
    userId: user.id,
    onStatsChanged: pageData.fetchFriendsStats,
  });

  const handleShowMutualsList = async () => {
    if (!isVip) {
      setShowProModal(true);
      return;
    }
    setIsMutualsModalOpen(true);
  };

  const handleShowAffiliationsList = async () => {
    if (!isVip) {
      setShowProModal(true);
      return;
    }
    setIsAffiliationsModalOpen(true);
  };

  const handleUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setIsOpenToMeet(updatedUser.is_open_to_meet);
  };

  const handleAddEntityClick = () => {
    if (!isVip) {
      setShowProModal(true);
      return;
    }
    setCreateEntityType("hub");
    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    pageData.fetchAffiliations();
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <ProfileMainColumn
        user={user}
        currentUser={currentUser}
        isOwnProfile={isOwnProfile}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        friendshipStatus={pageData.friendshipStatus}
        friendsStats={pageData.friendsStats}
        friendsCount={pageData.friendsCount}
        loadingUserFriends={directory.loadingUserFriends}
        affiliations={pageData.affiliations}
        isLoadingAffiliations={pageData.isLoadingAffiliations}
        isUploadingBanner={profileActions.isUploadingBanner}
        isOpenToMeet={isOpenToMeet}
        onBannerUpload={profileActions.handleBannerUpload}
        onBannerDelete={profileActions.handleBannerDelete}
        onShowFriendsList={friends.handleShowFriendsList}
        onShowFriendRequestsList={friends.handleShowFriendRequestsList}
        onShowUserFriendsList={directory.handleShowUserFriendsList}
        onShowAffiliationsList={handleShowAffiliationsList}
        onAddEntityClick={handleAddEntityClick}
        onToggleOpenToMeet={profileActions.handleToggleOpenToMeet}
        onUpdate={handleUpdate}
      />

      <ProfileSidebarColumn
        user={user}
        isOwnProfile={isOwnProfile}
        profileQrEnabled={profileQrEnabled}
        totalUsers={pageData.totalUsers}
        usersInCountry={pageData.usersInCountry}
        usersInCity={pageData.usersInCity}
        loadingUsers={directory.loadingUsers}
        loadUsersList={directory.loadUsersList}
        mutualFollowers={pageData.mutualFollowers}
        isCheckingPro={false}
        onShowMutualsList={handleShowMutualsList}
        isLoadingInvite={profileActions.isLoadingInvite}
        isGeneratingInvite={profileActions.isGeneratingInvite}
        isCopied={profileActions.isCopied}
        onCopyInviteLink={profileActions.handleCopyInviteLink}
        upcomingEvents={pageData.upcomingEvents}
        meetingRequestsEnabled={meetingRequestsEnabled}
        canRequestMeeting={meetings.canRequestMeeting}
        sharedEventsForMeeting={meetings.sharedEventsForMeeting}
        onOpenProfileMeetingRequest={meetings.handleOpenProfileMeetingRequest}
        isLoadingMeetingRequests={meetings.isLoadingMeetingRequests}
        actionNeededMeetingRequestsCount={meetings.actionNeededMeetingRequestsCount}
        upcomingMeetingRequestsCount={meetings.upcomingMeetingRequestsCount}
        onOpenMeetingCalendarModal={meetings.handleOpenMeetingCalendarModal}
        onOpenMeetingRequestsModal={meetings.handleOpenMeetingRequestsModal}
      />

      <AvatarListModal
        isOpen={isMutualsModalOpen}
        onClose={() => setIsMutualsModalOpen(false)}
        title="Your mutuals"
        ariaLabel="Mutual followers list"
        emptyText="No mutual followers"
        items={pageData.mutualFollowers.map((follower) => ({
          id: follower.id,
          avatar_url: follower.avatar_url,
          name: follower.twitter_name,
          handle: follower.twitter_handle,
        }))}
      />

      <ProfileAffiliationsModal
        isOpen={isAffiliationsModalOpen}
        onClose={() => setIsAffiliationsModalOpen(false)}
        isVip={Boolean(isVip)}
        isOwnProfile={isOwnProfile}
        affiliations={pageData.affiliations}
        onUpgradeClick={() => {
          setIsAffiliationsModalOpen(false);
          router.push("/subscription");
        }}
      />

      <ProfileCreateEntityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        createEntityType={createEntityType}
        setCreateEntityType={setCreateEntityType}
        onSuccess={handleCreateSuccess}
      />

      <AvatarListModal
        isOpen={friends.isFriendsModalOpen}
        onClose={() => friends.setIsFriendsModalOpen(false)}
        title="Your Friends"
        ariaLabel="Friends list"
        emptyText="No friends"
        items={friends.friendsList.map((friend) => ({
          id: friend.id,
          avatar_url: friend.avatar_url,
          name: friend.twitter_name,
          handle: friend.twitter_handle,
        }))}
      />

      <ProfileFriendRequestsModal
        isOpen={friends.isFriendRequestsModalOpen}
        onClose={() => friends.setIsFriendRequestsModalOpen(false)}
        requests={friends.friendRequestsList}
        onAccept={friends.handleAcceptFriendRequest}
        onDecline={friends.handleDeclineFriendRequest}
      />

      <MeetingRequestForm
        isOpen={meetings.isProfileMeetingModalOpen}
        onClose={() => meetings.setIsProfileMeetingModalOpen(false)}
        targetUser={{
          id: user.id,
          name: currentUser.twitter_name || "user",
        }}
        sharedEvents={meetings.sharedEventsForMeeting}
        defaultEventId={meetings.sharedEventsForMeeting[0]?.id ?? null}
        onSuccess={({ eventId }) => {
          trackEvent("meeting_request_create", {
            event_category: "Meeting Requests",
            event_label: "from_profile",
            event_id: eventId,
          });
          meetings.setIsProfileMeetingModalOpen(false);
        }}
      />

      <ProSubscriptionModal
        isOpen={meetings.showProfileMeetingProModal}
        onClose={() => meetings.setShowProfileMeetingProModal(false)}
        title="Meeting requests are available with PRO subscription"
        description="Upgrade to PRO to send meeting requests to other attendees."
      />
      <AuthRequiredModal
        isOpen={meetings.showProfileMeetingAuthModal}
        onClose={() => meetings.setShowProfileMeetingAuthModal(false)}
        title="Sign in to request a meeting"
        description="You need to be signed in to send a meeting request."
      />

      <MeetingCalendarModal
        isOpen={meetings.isMeetingCalendarModalOpen}
        onClose={() => meetings.setIsMeetingCalendarModalOpen(false)}
        isLoadingMeetingRequests={meetings.isLoadingMeetingRequests}
        meetingRequestsError={meetings.meetingRequestsError}
        approvedMeetingCalendarEvents={meetings.approvedMeetingCalendarEvents}
        meetingCalendarInitialDate={meetings.meetingCalendarInitialDate}
        meetingCalendarAutoScrollTargetId={meetings.meetingCalendarAutoScrollTarget?.id}
        meetingCalendarContainerRef={meetings.meetingCalendarContainerRef}
        targetMeetingEventRef={meetings.targetMeetingEventRef}
        onEventClick={meetings.handleOpenMeetingDetailsFromCalendar}
      />

      <MeetingDetailsModal
        isOpen={meetings.isMeetingDetailsModalOpen}
        onClose={meetings.handleCloseMeetingDetailsModal}
        selectedMeeting={meetings.selectedMeetingFromCalendar}
        isOpeningMeetingChat={meetings.isOpeningMeetingChat}
        onOpenChat={meetings.handleOpenMeetingDetailsChat}
      />

      <ProSubscriptionModal
        isOpen={meetings.showMeetingDetailsChatProModal}
        onClose={() => meetings.setShowMeetingDetailsChatProModal(false)}
        title="Private messaging is available only with PRO subscription"
        description="Upgrade to PRO to send direct messages to other users."
      />
      <AuthRequiredModal
        isOpen={meetings.showMeetingDetailsChatAuthModal}
        onClose={() => meetings.setShowMeetingDetailsChatAuthModal(false)}
        title="Sign in to send a message"
        description="You need to be signed in to start a direct chat."
      />

      <MeetingRequestsModal
        isOpen={meetings.isMeetingRequestsModalOpen}
        onClose={() => meetings.setIsMeetingRequestsModalOpen(false)}
        isLoadingMeetingRequests={meetings.isLoadingMeetingRequests}
        meetingRequestsError={meetings.meetingRequestsError}
        meetingRequests={meetings.meetingRequests}
        currentAuthUserId={meetings.currentAuthUserId}
        actingMeetingRequest={meetings.actingMeetingRequest}
        rescheduleDrafts={meetings.rescheduleDrafts}
        setRescheduleDrafts={meetings.setRescheduleDrafts}
        onApprove={meetings.handleApproveMeetingRequest}
        onReject={meetings.handleRejectMeetingRequest}
        onToggleReschedule={meetings.handleToggleReschedule}
        onSubmitReschedule={meetings.handleSubmitReschedule}
      />

      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description="This feature is available only with PRO subscription. Upgrade to PRO to unlock this feature."
      />

      <AuthRequiredModal
        isOpen={directory.showAuthModal}
        onClose={() => directory.setShowAuthModal(false)}
        title="Sign in required"
        description="Please sign up or log in to view the full list."
      />

      <ProSubscriptionModal
        isOpen={directory.showProModalUsers}
        onClose={() => directory.setShowProModalUsers(false)}
        title="This feature is available only with PRO subscription"
        description="Viewing all users is available only with PRO subscription. Upgrade to PRO to unlock this feature."
      />

      <UserListModal
        isOpen={directory.showTotalUsersModal}
        onClose={() => directory.setShowTotalUsersModal(false)}
        title="All Users on SolPoint"
        ariaLabel="All Users on SolPoint"
        users={directory.usersList}
        emptyText="No users found"
        friendStatuses={directory.friendStatuses}
        onAddFriend={directory.handleAddFriend}
        sendingFriendRequest={directory.sendingFriendRequest}
        creatingChat={directory.creatingChat}
      />

      <UserListModal
        isOpen={directory.showCountryUsersModal}
        onClose={() => directory.setShowCountryUsersModal(false)}
        title="Users in your country"
        ariaLabel="Users in your country"
        users={directory.usersList}
        emptyText="No users found"
        friendStatuses={directory.friendStatuses}
        onAddFriend={directory.handleAddFriend}
        sendingFriendRequest={directory.sendingFriendRequest}
        creatingChat={directory.creatingChat}
      />

      <UserListModal
        isOpen={directory.showCityUsersModal}
        onClose={() => directory.setShowCityUsersModal(false)}
        title="Users in your city"
        ariaLabel="Users in your city"
        users={directory.usersList}
        emptyText="No users found"
        friendStatuses={directory.friendStatuses}
        onAddFriend={directory.handleAddFriend}
        sendingFriendRequest={directory.sendingFriendRequest}
        creatingChat={directory.creatingChat}
      />

      <UserListModal
        isOpen={directory.showUserFriendsModal}
        onClose={() => directory.setShowUserFriendsModal(false)}
        title={`${user.twitter_name}'s Friends`}
        ariaLabel={`${user.twitter_name}'s Friends`}
        users={directory.userFriendsList}
        emptyText="No friends found"
        friendStatuses={directory.userFriendsStatuses}
        onAddFriend={directory.handleAddFriend}
        sendingFriendRequest={directory.sendingFriendRequest}
        creatingChat={directory.creatingChat}
      />
    </div>
  );
}
