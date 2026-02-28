"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import type { Invite, User } from "@/types";
import {
  deleteProfileBanner,
  updateOpenToMeet,
  uploadProfileBanner,
} from "@/lib/api/profile";
import { createInvite, findActiveInvite, getUserInvites } from "@/lib/api/invites";
import { getAppUrl } from "@/lib/utils";

interface UseProfileActionsParams {
  isOwnProfile: boolean;
  setCurrentUser: (updater: (prev: User) => User) => void;
  isOpenToMeet: boolean;
  setIsOpenToMeet: (value: boolean) => void;
}

export function useProfileActions({
  isOwnProfile,
  setCurrentUser,
  isOpenToMeet,
  setIsOpenToMeet,
}: UseProfileActionsParams) {
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<Invite | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const fetchUserInvites = useCallback(async () => {
    setIsLoadingInvite(true);
    try {
      const invites = await getUserInvites();
      const activeInvite = findActiveInvite(invites);
      setCurrentInvite(activeInvite);
    } catch (error) {
      console.error("Error fetching invites:", error);
    } finally {
      setIsLoadingInvite(false);
    }
  }, []);

  useEffect(() => {
    if (!isOwnProfile) {
      return;
    }
    fetchUserInvites();
  }, [isOwnProfile, fetchUserInvites]);

  const handleGenerateInvite = useCallback(async (): Promise<Invite | null> => {
    setIsGeneratingInvite(true);
    setIsCopied(false);

    try {
      const invite = await createInvite();
      setCurrentInvite(invite);
      return invite;
    } catch (error) {
      console.error("Error generating invite:", error);
      alert(error instanceof Error ? error.message : "Failed to generate invite");
      return null;
    } finally {
      setIsGeneratingInvite(false);
    }
  }, []);

  const handleCopyInviteLink = useCallback(async () => {
    let inviteToCopy = currentInvite;

    if (!inviteToCopy) {
      inviteToCopy = await handleGenerateInvite();
      if (!inviteToCopy) {
        return;
      }
    }

    const appUrl = getAppUrl();
    const inviteLink = `${appUrl}/signup?invite=${inviteToCopy.code}`;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      alert("Failed to copy link to clipboard");
    }
  }, [currentInvite, handleGenerateInvite]);

  const handleToggleOpenToMeet = useCallback(async () => {
    const newValue = !isOpenToMeet;
    setIsOpenToMeet(newValue);

    try {
      await updateOpenToMeet(newValue);
      setCurrentUser((prev) => ({ ...prev, is_open_to_meet: newValue }));
    } catch (error) {
      console.error("Error updating open to meet:", error);
      setIsOpenToMeet(!newValue);
    }
  }, [isOpenToMeet, setCurrentUser, setIsOpenToMeet]);

  const handleBannerUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingBanner(true);
      try {
        const data = await uploadProfileBanner(file);
        setCurrentUser((prev) => ({ ...prev, banner_url: data.banner_url }));
      } catch (error) {
        console.error("Error uploading banner:", error);
        alert(error instanceof Error ? error.message : "Failed to upload banner");
      } finally {
        setIsUploadingBanner(false);
        e.target.value = "";
      }
    },
    [setCurrentUser]
  );

  const handleBannerDelete = useCallback(async () => {
    if (!confirm("Are you sure you want to remove your banner?")) {
      return;
    }

    setIsUploadingBanner(true);
    try {
      await deleteProfileBanner();
      setCurrentUser((prev) => ({ ...prev, banner_url: undefined }));
    } catch (error) {
      console.error("Error deleting banner:", error);
      alert(error instanceof Error ? error.message : "Failed to delete banner");
    } finally {
      setIsUploadingBanner(false);
    }
  }, [setCurrentUser]);

  return {
    isGeneratingInvite,
    isCopied,
    currentInvite,
    isLoadingInvite,
    isUploadingBanner,
    handleCopyInviteLink,
    handleGenerateInvite,
    handleToggleOpenToMeet,
    handleBannerUpload,
    handleBannerDelete,
    fetchUserInvites,
    setCurrentInvite,
  };
}
