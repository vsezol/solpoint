"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateChat } from "@/lib/api/chats";

/**
 * Hook for handling chat operations
 */
export function useChat() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const openChat = async (otherUserId: string) => {
    if (loading) return;

    try {
      setLoading(true);
      const chat = await getOrCreateChat(otherUserId);
      router.push(`/chat/${chat.id}`);
    } catch (error) {
      console.error("Failed to open chat:", error);
      alert(error instanceof Error ? error.message : "Failed to open chat");
    } finally {
      setLoading(false);
    }
  };

  return {
    openChat,
    isLoading: loading,
  };
}


