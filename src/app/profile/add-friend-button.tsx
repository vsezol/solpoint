"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { UserPlus, Check, X, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface AddFriendButtonProps {
  userId: string;
  userHandle?: string;
  initialStatus?: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked";
}

export function AddFriendButton({ userId, userHandle, initialStatus = "none" }: AddFriendButtonProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const handleAddFriend = async () => {
    setIsLoading(true);
    trackEvent("profile_add_friend_click", {
      event_category: "Profiles",
      event_label: userHandle || userId,
      target_user_id: userId,
    });
    
    try {
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ friend_id: userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add friend");
      }

      // Обновляем статус на основе ответа API
      // API возвращает status: "mutual" или "following"
      const isMutual = data.data?.status === "mutual" || data.data?.isMutual;
      if (isMutual) {
        setStatus("accepted");
        trackEvent("profile_add_friend_success", {
          event_category: "Profiles",
          event_label: userHandle || userId,
          target_user_id: userId,
          friendship_type: "mutual",
        });
      } else if (data.data?.status === "following") {
        setStatus("pending_sent");
        trackEvent("profile_add_friend_success", {
          event_category: "Profiles",
          event_label: userHandle || userId,
          target_user_id: userId,
          friendship_type: "following",
        });
      } else {
        setStatus("pending_sent");
        trackEvent("profile_add_friend_success", {
          event_category: "Profiles",
          event_label: userHandle || userId,
          target_user_id: userId,
          friendship_type: "following",
        });
      }
    } catch (error) {
      console.error("Error adding friend:", error);
      alert(error instanceof Error ? error.message : "Failed to add friend");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    setIsLoading(true);
    trackEvent("profile_remove_friend", {
      event_category: "Profiles",
      event_label: userHandle || userId,
      target_user_id: userId,
      previous_status: status,
    });
    
    try {
      const response = await fetch(`/api/friends?friend_id=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove friend");
      }

      // После отписки статус становится "none"
      setStatus("none");
    } catch (error) {
      console.error("Error removing friend:", error);
      alert(error instanceof Error ? error.message : "Failed to remove friend");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "accepted") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleRemoveFriend}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Check className="w-4 h-4 mr-2" />
        )}
        Friends
      </Button>
    );
  }

  if (status === "pending_sent") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleRemoveFriend}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <X className="w-4 h-4 mr-2" />
        )}
        Cancel Request
      </Button>
    );
  }

  if (status === "pending_received") {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={handleAddFriend}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Check className="w-4 h-4 mr-2" />
        )}
        Accept Request
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={handleAddFriend}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <UserPlus className="w-4 h-4 mr-2" />
      )}
      Add Fren
    </Button>
  );
}

