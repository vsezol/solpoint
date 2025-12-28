import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/chats/[chatId] - Get chat by ID with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;

    // Get chat data
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select(
        `
        id,
        user1_id,
        user2_id,
        last_message_at,
        created_at,
        updated_at,
        user1:profiles!chats_user1_id_fkey (
          id,
          twitter_handle,
          twitter_name,
          avatar_url,
          is_verified
        ),
        user2:profiles!chats_user2_id_fkey (
          id,
          twitter_handle,
          twitter_name,
          avatar_url,
          is_verified
        )
      `
      )
      .eq("id", chatId)
      .single();

    if (chatError) throw chatError;

    // Verify user is part of the chat
    if (chat.user1_id !== authUser.id && chat.user2_id !== authUser.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get messages for this chat
    const { data: messages, error: messagesError } = await supabase
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
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    // Determine the other user (not the current user)
    const otherUser =
      chat.user1_id === authUser.id
        ? (chat.user2 as any)
        : (chat.user1 as any);

    return NextResponse.json({
      data: {
        id: chat.id,
        otherUser: {
          id: otherUser.id,
          twitter_handle: otherUser.twitter_handle,
          twitter_name: otherUser.twitter_name,
          avatar_url: otherUser.avatar_url,
          is_verified: otherUser.is_verified,
        },
        messages: messages || [],
        last_message_at: chat.last_message_at,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Get chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get chat" },
      { status: 500 }
    );
  }
}

