import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/chats/[chatId]/messages - Get messages for a chat
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

    // Verify user is part of the chat
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("user1_id, user2_id")
      .eq("id", chatId)
      .single();

    if (chatError) throw chatError;

    if (chat.user1_id !== authUser.id && chat.user2_id !== authUser.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get messages
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

    return NextResponse.json({
      data: messages || [],
      count: messages?.length || 0,
    });
  } catch (error: any) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get messages" },
      { status: 500 }
    );
  }
}

// POST /api/chats/[chatId]/messages - Send a message
export async function POST(
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
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: "Message content must be 5000 characters or less" },
        { status: 400 }
      );
    }

    // Verify user is part of the chat
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("user1_id, user2_id")
      .eq("id", chatId)
      .single();

    if (chatError) throw chatError;

    if (chat.user1_id !== authUser.id && chat.user2_id !== authUser.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        sender_id: authUser.id,
        content: content.trim(),
      })
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
      .single();

    if (messageError) throw messageError;

    return NextResponse.json({
      data: message,
    });
  } catch (error: any) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}

