import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/chats - Get all chats for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all chats where user is participant
    const { data: chats, error } = await supabase
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
      .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get unread count for each chat
    const chatsWithUnread = await Promise.all(
      (chats || []).map(async (chat) => {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("chat_id", chat.id)
          .neq("sender_id", authUser.id)
          .eq("is_read", false);

        const otherUser =
          chat.user1_id === authUser.id
            ? (chat.user1 as any)
            : (chat.user2 as any);

        return {
          id: chat.id,
          otherUser: {
            id: otherUser.id,
            twitter_handle: otherUser.twitter_handle,
            twitter_name: otherUser.twitter_name,
            avatar_url: otherUser.avatar_url,
            is_verified: otherUser.is_verified,
          },
          last_message_at: chat.last_message_at,
          unread_count: count || 0,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
        };
      })
    );

    return NextResponse.json({
      data: chatsWithUnread,
      count: chatsWithUnread.length,
    });
  } catch (error: any) {
    console.error("Get chats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get chats" },
      { status: 500 }
    );
  }
}

// POST /api/chats - Create or get chat with another user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { other_user_id } = body;

    if (!other_user_id) {
      return NextResponse.json(
        { error: "other_user_id is required" },
        { status: 400 }
      );
    }

    if (other_user_id === authUser.id) {
      return NextResponse.json(
        { error: "Cannot create chat with yourself" },
        { status: 400 }
      );
    }

    // Use the database function to get or create chat
    const { data: chatId, error: functionError } = await supabase.rpc(
      "get_or_create_chat",
      {
        p_user1_id: authUser.id,
        p_user2_id: other_user_id,
      }
    );

    if (functionError) throw functionError;

    // Get the full chat data
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
        last_message_at: chat.last_message_at,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Create/get chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create/get chat" },
      { status: 500 }
    );
  }
}

