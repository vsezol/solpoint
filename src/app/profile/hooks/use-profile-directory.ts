"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@/types";
import type { DirectoryUser, FriendshipStatus, UsersFilterType } from "@/types/profile";
import {
  addFriend,
  getFriendStatuses,
  getFriendsList,
  mapFollowStatusesToFriendshipStatuses,
} from "@/lib/api/friends";
import { getUsersList } from "@/lib/api/users";

interface UseProfileDirectoryParams {
  user: User;
  isAuthenticated: boolean;
  hasCurrentAuthUser: boolean;
}

export function useProfileDirectory({
  user,
  isAuthenticated,
  hasCurrentAuthUser,
}: UseProfileDirectoryParams) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModalUsers, setShowProModalUsers] = useState(false);
  const [showTotalUsersModal, setShowTotalUsersModal] = useState(false);
  const [showCountryUsersModal, setShowCountryUsersModal] = useState(false);
  const [showCityUsersModal, setShowCityUsersModal] = useState(false);
  const [showUserFriendsModal, setShowUserFriendsModal] = useState(false);

  const [usersList, setUsersList] = useState<DirectoryUser[]>([]);
  const [userFriendsList, setUserFriendsList] = useState<DirectoryUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingUserFriends, setLoadingUserFriends] = useState(false);

  const [friendStatuses, setFriendStatuses] = useState<Record<string, FriendshipStatus>>({});
  const [userFriendsStatuses, setUserFriendsStatuses] = useState<Record<string, FriendshipStatus>>({});
  const [sendingFriendRequest, setSendingFriendRequest] = useState<Record<string, boolean>>({});
  const [creatingChat] = useState<Record<string, boolean>>({});

  const hydrateFriendStatuses = useCallback(async (users: DirectoryUser[]) => {
    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) {
      return {};
    }

    try {
      const { statuses } = await getFriendStatuses(userIds);
      return mapFollowStatusesToFriendshipStatuses(statuses);
    } catch (error) {
      console.error("Error fetching friend statuses:", error);
      return userIds.reduce<Record<string, FriendshipStatus>>((acc, userId) => {
        acc[userId] = "none";
        return acc;
      }, {});
    }
  }, []);

  const loadUsersList = useCallback(
    async (filterType: UsersFilterType) => {
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      setLoadingUsers(true);
      try {
        const result = await getUsersList({
          filter: filterType,
          country_code: filterType === "country" ? user.country_code || undefined : undefined,
          city: filterType === "city" ? user.city || undefined : undefined,
        });

        setUsersList(result.users || []);

        if (filterType === "all") {
          setShowTotalUsersModal(true);
        } else if (filterType === "country") {
          setShowCountryUsersModal(true);
        } else {
          setShowCityUsersModal(true);
        }
      } catch (error) {
        console.error("Error loading users list:", error);
        alert(error instanceof Error ? error.message : "Failed to load users");
      } finally {
        setLoadingUsers(false);
      }
    },
    [isAuthenticated, user.country_code, user.city]
  );

  const handleShowUserFriendsList = useCallback(async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

      setLoadingUserFriends(true);
    try {
      const friends = await getFriendsList({ userId: user.id, type: "mutual" });
      const formattedFriends: DirectoryUser[] = friends.map((friend) => ({
        id: friend.id,
        avatar_url: friend.avatar_url,
        name: friend.twitter_name,
        twitter_handle: friend.twitter_handle,
        isVerified: friend.is_verified,
      }));

      setUserFriendsList(formattedFriends);
      setShowUserFriendsModal(true);
    } catch (error) {
      console.error("Error loading user friends list:", error);
      alert(error instanceof Error ? error.message : "Failed to load friends");
    } finally {
      setLoadingUserFriends(false);
    }
  }, [isAuthenticated, user.id]);

  const handleAddFriend = useCallback(
    async (userId: string) => {
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      setSendingFriendRequest((prev) => ({ ...prev, [userId]: true }));
      try {
        const response = await addFriend(userId);
        setFriendStatuses((prev) => ({ ...prev, [userId]: response.status }));
        setUserFriendsStatuses((prev) => ({ ...prev, [userId]: response.status }));
      } catch (error) {
        console.error("Error adding friend:", error);
      } finally {
        setSendingFriendRequest((prev) => ({ ...prev, [userId]: false }));
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    if (!(showTotalUsersModal || showCountryUsersModal || showCityUsersModal) || !isAuthenticated || !hasCurrentAuthUser) {
      return;
    }

    hydrateFriendStatuses(usersList).then((statusMap) => {
      setFriendStatuses(statusMap);
    });
  }, [
    showTotalUsersModal,
    showCountryUsersModal,
    showCityUsersModal,
    usersList,
    isAuthenticated,
    hasCurrentAuthUser,
    hydrateFriendStatuses,
  ]);

  useEffect(() => {
    if (!showUserFriendsModal || !isAuthenticated || !hasCurrentAuthUser) {
      return;
    }

    hydrateFriendStatuses(userFriendsList).then((statusMap) => {
      setUserFriendsStatuses(statusMap);
    });
  }, [showUserFriendsModal, userFriendsList, isAuthenticated, hasCurrentAuthUser, hydrateFriendStatuses]);

  return {
    showAuthModal,
    setShowAuthModal,
    showProModalUsers,
    setShowProModalUsers,
    showTotalUsersModal,
    setShowTotalUsersModal,
    showCountryUsersModal,
    setShowCountryUsersModal,
    showCityUsersModal,
    setShowCityUsersModal,
    showUserFriendsModal,
    setShowUserFriendsModal,
    usersList,
    userFriendsList,
    loadingUsers,
    loadingUserFriends,
    friendStatuses,
    userFriendsStatuses,
    sendingFriendRequest,
    creatingChat,
    loadUsersList,
    handleShowUserFriendsList,
    handleAddFriend,
  };
}
