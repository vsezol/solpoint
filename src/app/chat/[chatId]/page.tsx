"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getOrCreateChat } from "@/lib/api/chats";
import { useChatWebSocket, type Message } from "@/hooks/use-chat-websocket";

interface ChatData {
  id: string;
  otherUser: {
    id: string;
    twitter_handle: string;
    twitter_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  messages: Message[];
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const chatId = params.chatId as string;
  const [chat, setChat] = useState<ChatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Handle new messages from WebSocket
  const handleNewMessage = useCallback(
    (message: Message) => {
      setChat((prev) => {
        if (!prev) return prev;
        
        // Check if message already exists (avoid duplicates)
        if (prev.messages.some((m) => m.id === message.id)) {
          return prev;
        }

        return {
          ...prev,
          messages: [...prev.messages, message],
          last_message_at: message.created_at,
        };
      });

      // Mark messages as read if it's from the other user
      if (message.sender_id !== user?.id) {
        fetch(`/api/chats/${chatId}/read`, {
          method: "PATCH",
        }).catch((err) => {
          console.error("Error marking messages as read:", err);
        });
      }
    },
    [chatId, user?.id]
  );

  // Handle WebSocket errors
  const handleWebSocketError = useCallback((error: Error) => {
    console.error("WebSocket error:", error);
    // Don't show error to user for connection issues, just log it
    // The hook will handle reconnection automatically
  }, []);

  // Setup WebSocket connection
  const { isConnected, connectionError } = useChatWebSocket({
    chatId,
    userId: user?.id || "",
    onMessage: handleNewMessage,
    onError: handleWebSocketError,
    enabled: !!chatId && !!user?.id && !!chat,
  });

  // Fetch chat data
  useEffect(() => {
    if (!chatId || !user) return;

    const fetchChat = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/chats/${chatId}`);
        
        if (!response.ok) {
          // If chat not found (404), try to create it
          // Check if chatId might be a user ID (for backward compatibility or direct links)
          if (response.status === 404) {
            // Check if chatId is not the current user's ID
            if (chatId === user.id) {
              console.error("Cannot create chat with yourself");
              setLoading(false);
              return;
            }
            
            // Try to create chat with chatId as other_user_id
            try {
              const newChat = await getOrCreateChat(chatId);
              // Redirect to the correct chat URL
              router.replace(`/chat/${newChat.id}`);
              return;
            } catch (createError) {
              // If creating chat fails, chatId is probably not a user ID
              // Show error message
              console.error("Error creating chat:", createError);
              setError("Chat not found and could not be created. Please try again.");
              setLoading(false);
              return;
            }
          }
          
          if (response.status === 403) {
            router.push("/");
            return;
          }
          
          throw new Error("Failed to fetch chat");
        }

        const result = await response.json();
        setChat(result.data);
        setError(null); // Clear any previous errors

        // Mark messages as read
        await fetch(`/api/chats/${chatId}/read`, {
          method: "PATCH",
        });
      } catch (error) {
        console.error("Error fetching chat:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
  }, [chatId, router, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || sending || !chat) return;

    const content = messageContent.trim();
    setMessageContent("");
    setSending(true);

    try {
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
        throw new Error("Failed to send message");
      }

      const result = await response.json();
      const newMessage = result.data;

      // Update chat with new message (optimistic update)
      // WebSocket will also receive this message, but we update immediately for better UX
      setChat((prev) => {
        if (!prev) return prev;
        
        // Check if message already exists (from WebSocket)
        if (prev.messages.some((m) => m.id === newMessage.id)) {
          return prev;
        }

        return {
          ...prev,
          messages: [...prev.messages, newMessage],
          last_message_at: newMessage.created_at,
        };
      });

      // Mark messages as read
      await fetch(`/api/chats/${chatId}/read`, {
        method: "PATCH",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setMessageContent(content); // Restore message on error
    } finally {
      setSending(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-[var(--color-text-secondary)]">Loading chat...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!chat && !loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[var(--color-text-secondary)] mb-4">
              {error || "Chat not found"}
            </div>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 py-6 mt-[50px]">
        {/* Chat Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-surface-border)] mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mr-2"
          >
            ← Back
          </Button>
          <Avatar
            src={chat.otherUser.avatar_url || undefined}
            alt={chat.otherUser.twitter_name}
            size="md"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {chat.otherUser.twitter_name}
              </h1>
              {chat.otherUser.is_verified && (
                <svg
                  className="w-4 h-4 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {/* Connection status indicator */}
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? "bg-green-500"
                    : "bg-yellow-500 animate-pulse"
                }`}
                title={
                  isConnected
                    ? "Connected"
                    : connectionError
                      ? `Connecting... (${connectionError.message})`
                      : "Connecting..."
                }
              />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              @{chat.otherUser.twitter_handle}
            </p>
          </div>
        </div>

        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-0"
        >
          {chat.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
              No messages yet. Start the conversation!
            </div>
          ) : (
            chat.messages.map((message) => {
              const isOwnMessage = user?.id === message.sender_id;
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                >
                  <Avatar
                    src={message.sender.avatar_url || undefined}
                    alt={message.sender.twitter_name}
                    size="sm"
                  />
                  <div
                    className={`flex flex-col max-w-[70%] ${
                      isOwnMessage ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isOwnMessage
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="flex justify-center">
          <form onSubmit={handleSendMessage} className="flex gap-2 max-w-2xl">
            <Input
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={!messageContent.trim() || sending}
              isLoading={sending}
            >
              Send
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

