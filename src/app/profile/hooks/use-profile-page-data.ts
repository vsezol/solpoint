"use client";

import { useCallback, useEffect, useState } from "react";
import type { Event, User } from "@/types";
import type { FriendshipStatus, ProfileAffiliation } from "@/types/profile";
import {
  getMutualFollowers,
  getProfileAffiliations,
  getProfileData,
  getProfileStats,
} from "@/lib/api/profile";
import { getFriendsStats } from "@/lib/api/friends";

interface UseProfilePageDataParams {
  user: User;
  isOwnProfile: boolean;
}

export function useProfilePageData({ user, isOwnProfile }: UseProfilePageDataParams) {
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [usersInCountry, setUsersInCountry] = useState<number>(0);
  const [usersInCity, setUsersInCity] = useState<number>(0);

  const [mutualFollowers, setMutualFollowers] = useState<User[]>([]);
  const [friendsStats, setFriendsStats] = useState({ friendsCount: 0, friendRequestsCount: 0 });
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>("none");
  const [friendsCount, setFriendsCount] = useState<number>(0);

  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [isLoadingProfileData, setIsLoadingProfileData] = useState(true);

  const [affiliations, setAffiliations] = useState<ProfileAffiliation[]>([]);
  const [isLoadingAffiliations, setIsLoadingAffiliations] = useState(true);

  const fetchProfileData = useCallback(async () => {
    setIsLoadingProfileData(true);
    try {
      const data = await getProfileData(user.id);
      setPastEvents(data.pastEvents || []);
      setFriendsCount(data.friendsCount || 0);
      setFriendshipStatus((data.friendshipStatus || "none") as FriendshipStatus);
      setUpcomingEvents(data.upcomingEvents || []);
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setIsLoadingProfileData(false);
    }
  }, [user.id]);

  const fetchStatistics = useCallback(async () => {
    try {
      const data = await getProfileStats({
        country_code: user.country_code || undefined,
        city: user.city || undefined,
      });

      setTotalUsers(data.total || 0);
      setUsersInCountry(data.inCountry || 0);
      setUsersInCity(data.inCity || 0);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  }, [user.country_code, user.city]);

  const fetchAffiliations = useCallback(async () => {
    setIsLoadingAffiliations(true);
    try {
      const items = await getProfileAffiliations({
        isOwnProfile,
        userId: user.id,
      });
      setAffiliations(items || []);
    } catch (error) {
      console.error("Error fetching affiliations:", error);
      setAffiliations([]);
    } finally {
      setIsLoadingAffiliations(false);
    }
  }, [isOwnProfile, user.id]);

  const fetchMutualFollowers = useCallback(async () => {
    try {
      const followers = await getMutualFollowers();
      setMutualFollowers(followers || []);
    } catch (error) {
      console.error("Error fetching mutual followers:", error);
      setMutualFollowers([]);
    }
  }, []);

  const fetchFriendsStats = useCallback(async () => {
    try {
      const stats = await getFriendsStats();
      setFriendsStats(stats);
    } catch (error) {
      console.error("Error fetching friends stats:", error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const promises: Promise<unknown>[] = [fetchProfileData(), fetchStatistics(), fetchAffiliations()];

      if (isOwnProfile) {
        promises.push(fetchMutualFollowers(), fetchFriendsStats());
      }

      await Promise.allSettled(promises);

      if (cancelled) {
        return;
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [fetchProfileData, fetchStatistics, fetchAffiliations, isOwnProfile, fetchMutualFollowers, fetchFriendsStats]);

  return {
    totalUsers,
    usersInCountry,
    usersInCity,
    mutualFollowers,
    friendsStats,
    friendshipStatus,
    friendsCount,
    upcomingEvents,
    pastEvents,
    isLoadingProfileData,
    affiliations,
    isLoadingAffiliations,
    setFriendshipStatus,
    fetchAffiliations,
    fetchFriendsStats,
  };
}
