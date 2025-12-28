import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/chats/[chatId]/read - Mark messages as read
export async function PATCH(
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

    // Mark all unread messages in this chat as read (except those sent by the user)
    const { data, error: updateError } = await supabase.rpc(
      "mark_messages_as_read",
      {
        p_chat_id: chatId,
        p_user_id: authUser.id,
      }
    );

    if (updateError) throw updateError;

    return NextResponse.json({
      data: {
        updated_count: data || 0,
      },
    });
  } catch (error: any) {
    console.error("Mark messages as read error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}

