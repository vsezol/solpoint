"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { UserPlus, Check, X, Loader2 } from "lucide-react";

interface AddFriendButtonProps {
  userId: string;
  initialStatus?: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked";
}

export function AddFriendButton({ userId, initialStatus = "none" }: AddFriendButtonProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const handleAddFriend = async () => {
    setIsLoading(true);
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

      // Обновляем статус
      if (data.data?.status === "accepted") {
        setStatus("accepted");
      } else {
        setStatus("pending_sent");
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
    try {
      const response = await fetch(`/api/friends?friend_id=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove friend");
      }

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
      Add Friend
    </Button>
  );
}

