"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

interface UseChatWebSocketOptions {
  chatId: string;
  userId: string;
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

/**
 * Hook for managing WebSocket connection to a chat
 * Uses Supabase Realtime for non-blocking WebSocket communication
 */
export function useChatWebSocket({
  chatId,
  userId,
  onMessage,
  onError,
  enabled = true,
}: UseChatWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second

  const connect = useCallback(() => {
    if (!enabled || !chatId || !userId) {
      return;
    }

    // Clean up existing connection
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const channel = supabaseRef.current
        .channel(`chat:${chatId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: userId },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `chat_id=eq.${chatId}`,
          },
          async (payload) => {
            try {
              // Fetch the full message with sender data
              const { data: message, error } = await supabaseRef.current
                .from("messages")
                .select(
                  `
                  id,
                  chat_id,
                  sender_id,
                  content,
                  is_read,
                  created_at,
                  updated_at,
                  sender:profiles!messages_sender_id_fkey (
                    id,
                    twitter_handle,
                    twitter_name,
                    avatar_url,
                    is_verified
                  )
                `
                )
                .eq("id", payload.new.id)
                .single();

              if (error) {
                console.error("Error fetching message:", error);
                if (onError) {
                  onError(new Error(`Failed to fetch message: ${error.message}`));
                }
                return;
              }

              if (message && onMessage) {
                onMessage(message as Message);
              }
            } catch (error) {
              console.error("Error processing message:", error);
              if (onError) {
                onError(
                  error instanceof Error
                    ? error
                    : new Error("Unknown error processing message")
                );
              }
            }
          }
        )
        .on("presence", { event: "sync" }, () => {
          setIsConnected(true);
          setConnectionError(null);
          reconnectAttemptsRef.current = 0; // Reset on successful connection
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsConnected(true);
            setConnectionError(null);
            reconnectAttemptsRef.current = 0;
          } else if (status === "CHANNEL_ERROR") {
            setIsConnected(false);
            const error = new Error("Channel subscription error");
            setConnectionError(error);
            if (onError) {
              onError(error);
            }
            // Attempt to reconnect
            scheduleReconnect();
          } else if (status === "TIMED_OUT") {
            setIsConnected(false);
            const error = new Error("Connection timed out");
            setConnectionError(error);
            scheduleReconnect();
          } else if (status === "CLOSED") {
            setIsConnected(false);
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error("Error setting up WebSocket connection:", error);
      const err =
        error instanceof Error
          ? error
          : new Error("Failed to setup WebSocket connection");
      setConnectionError(err);
      if (onError) {
        onError(err);
      }
      scheduleReconnect();
    }
  }, [chatId, userId, enabled, onMessage, onError]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current += 1;
    const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1); // Exponential backoff

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(
        `Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
      );
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    connectionError,
    reconnect: connect,
    disconnect,
  };
}

