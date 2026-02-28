"use client";

import { useCallback, useState } from "react";
import type { User } from "@/types";
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriendsList,
} from "@/lib/api/friends";

interface UseProfileFriendsParams {
  userId: string;
  onStatsChanged?: () => Promise<void> | void;
}

export function useProfileFriends({ userId, onStatsChanged }: UseProfileFriendsParams) {
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isFriendRequestsModalOpen, setIsFriendRequestsModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [friendRequestsList, setFriendRequestsList] = useState<User[]>([]);

  const handleShowFriendsList = useCallback(async () => {
    try {
      const friends = await getFriendsList({ userId, type: "mutual" });
      setFriendsList(friends || []);
      setIsFriendsModalOpen(true);
    } catch (error) {
      console.error("Error fetching friends list:", error);
    }
  }, [userId]);

  const handleShowFriendRequestsList = useCallback(async () => {
    try {
      const requests = await getFriendRequests();
      setFriendRequestsList(requests || []);
      setIsFriendRequestsModalOpen(true);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    }
  }, []);

  const handleAcceptFriendRequest = useCallback(
    async (friendId: string) => {
      try {
        await acceptFriendRequest(friendId);
        setFriendRequestsList((prev) => prev.filter((u) => u.id !== friendId));
        await onStatsChanged?.();
      } catch (error) {
        console.error("Error accepting friend request:", error);
        alert(error instanceof Error ? error.message : "Failed to accept friend request");
      }
    },
    [onStatsChanged]
  );

  const handleDeclineFriendRequest = useCallback(
    async (friendId: string) => {
      try {
        await declineFriendRequest(friendId);
        setFriendRequestsList((prev) => prev.filter((u) => u.id !== friendId));
        await onStatsChanged?.();
      } catch (error) {
        console.error("Error declining friend request:", error);
        alert(error instanceof Error ? error.message : "Failed to decline friend request");
      }
    },
    [onStatsChanged]
  );

  return {
    isFriendsModalOpen,
    setIsFriendsModalOpen,
    isFriendRequestsModalOpen,
    setIsFriendRequestsModalOpen,
    friendsList,
    friendRequestsList,
    handleShowFriendsList,
    handleShowFriendRequestsList,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
  };
}
