/**
 * API utilities for working with chats
 * 
 * Example usage:
 * 
 * // On profile page - create/get chat and navigate to it
 * import { getOrCreateChat } from "@/lib/api/chats";
 * import { useRouter } from "next/navigation";
 * 
 * const router = useRouter();
 * const handleSendMessage = async (otherUserId: string) => {
 *   try {
 *     const chat = await getOrCreateChat(otherUserId);
 *     router.push(`/chat/${chat.id}`);
 *   } catch (error) {
 *     console.error("Failed to create chat:", error);
 *   }
 * };
 */

export interface Chat {
  id: string;
  otherUser: {
    id: string;
    twitter_handle: string;
    twitter_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatWithMessages extends Chat {
  messages: Message[];
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender: {
    id: string;
    twitter_handle: string;
    twitter_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

/**
 * Get or create a chat with another user
 * If chat exists, returns it. Otherwise, creates a new chat.
 */
export async function getOrCreateChat(
  otherUserId: string
): Promise<Chat> {
  const response = await fetch("/api/chats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      other_user_id: otherUserId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get or create chat");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get all chats for the current user
 */
export async function getChats(): Promise<Chat[]> {
  const response = await fetch("/api/chats");

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get chats");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get a chat by ID with messages
 */
export async function getChat(chatId: string): Promise<ChatWithMessages> {
  const response = await fetch(`/api/chats/${chatId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get chat");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Send a message to a chat
 */
export async function sendMessage(
  chatId: string,
  content: string
): Promise<Message> {
  const response = await fetch(`/api/chats/${chatId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to send message");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Mark messages in a chat as read
 */
export async function markChatAsRead(chatId: string): Promise<number> {
  const response = await fetch(`/api/chats/${chatId}/read`, {
    method: "PATCH",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to mark messages as read");
  }

  const result = await response.json();
  return result.data.updated_count;
}

