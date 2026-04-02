import type { User } from "@/types";
import type { FriendshipStatus } from "@/types/profile";

export type FollowStatus = "none" | "following" | "follower" | "mutual";

export interface FriendStatusResponse {
  status: FriendshipStatus;
  followStatus: FollowStatus;
  isMutual: boolean;
  userFollowsOther: boolean;
  otherFollowsUser: boolean;
}

export interface FriendStatusesResponse {
  statuses: Record<string, FollowStatus>;
}

export interface FriendsStatsResponse {
  friendsCount: number;
  friendRequestsCount: number;
}

export interface FriendsListResponse {
  data: User[];
  count: number;
  type: string;
}

async function parseJsonOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed with status ${response.status}`);
  }
  return data;
}

function mapFollowStatusToFriendshipStatus(status: FollowStatus): FriendshipStatus {
  if (status === "mutual") {
    return "accepted";
  }
  if (status === "following") {
    return "pending_sent";
  }
  if (status === "follower") {
    return "pending_received";
  }
  return "none";
}

export async function addFriend(friendId: string): Promise<FriendStatusResponse> {
  const response = await fetch("/api/friends", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ friend_id: friendId }),
  });

  const data = (await parseJsonOrThrow(response)) as {
    data?: {
      status?: FollowStatus;
      isMutual?: boolean;
    };
  };

  const followStatus = data.data?.status || (data.data?.isMutual ? "mutual" : "following");
  return {
    status: mapFollowStatusToFriendshipStatus(followStatus),
    followStatus,
    isMutual: followStatus === "mutual",
    userFollowsOther: true,
    otherFollowsUser: followStatus === "mutual",
  };
}

export async function removeFriend(friendId: string): Promise<void> {
  const response = await fetch(`/api/friends?friend_id=${encodeURIComponent(friendId)}`, {
    method: "DELETE",
  });

  await parseJsonOrThrow(response);
}

export async function getFriendStatus(userId: string): Promise<FriendStatusResponse> {
  const response = await fetch(`/api/friends?user_id=${encodeURIComponent(userId)}`);
  const data = (await parseJsonOrThrow(response)) as {
    data?: {
      status?: FriendshipStatus;
      followStatus?: FollowStatus;
      isMutual?: boolean;
      userFollowsOther?: boolean;
      otherFollowsUser?: boolean;
    };
  };

  const followStatus = data.data?.followStatus || "none";
  return {
    status: data.data?.status || mapFollowStatusToFriendshipStatus(followStatus),
    followStatus,
    isMutual: Boolean(data.data?.isMutual),
    userFollowsOther: Boolean(data.data?.userFollowsOther),
    otherFollowsUser: Boolean(data.data?.otherFollowsUser),
  };
}

export async function getFriendStatuses(userIds: string[]): Promise<FriendStatusesResponse> {
  if (userIds.length === 0) {
    return { statuses: {} };
  }

  const response = await fetch("/api/friends/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_ids: userIds }),
  });

  const data = (await parseJsonOrThrow(response)) as FriendStatusesResponse;
  return {
    statuses: data.statuses || {},
  };
}

export async function getFriendsList(params: {
  userId: string;
  type: "mutual" | "followers" | "following";
}): Promise<User[]> {
  const response = await fetch(
    `/api/friends/list?user_id=${encodeURIComponent(params.userId)}&type=${encodeURIComponent(params.type)}`
  );
  const data = (await parseJsonOrThrow(response)) as FriendsListResponse;
  return data.data || [];
}

export async function getFriendRequests(): Promise<User[]> {
  const response = await fetch("/api/friends/requests");
  const data = (await parseJsonOrThrow(response)) as { data?: User[] };
  return data.data || [];
}

export async function acceptFriendRequest(friendId: string): Promise<void> {
  const response = await fetch("/api/friends/requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ friend_id: friendId }),
  });

  await parseJsonOrThrow(response);
}

export async function declineFriendRequest(friendId: string): Promise<void> {
  const response = await fetch(`/api/friends/requests?friend_id=${encodeURIComponent(friendId)}`, {
    method: "DELETE",
  });

  await parseJsonOrThrow(response);
}

export async function getFriendsStats(): Promise<FriendsStatsResponse> {
  const response = await fetch("/api/friends/stats");
  const data = (await parseJsonOrThrow(response)) as Partial<FriendsStatsResponse>;

  return {
    friendsCount: data.friendsCount || 0,
    friendRequestsCount: data.friendRequestsCount || 0,
  };
}

export function mapFollowStatusesToFriendshipStatuses(statuses: Record<string, FollowStatus>): Record<string, FriendshipStatus> {
  return Object.fromEntries(
    Object.entries(statuses).map(([userId, status]) => [userId, mapFollowStatusToFriendshipStatus(status)])
  );
}
