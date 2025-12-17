import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/friends - добавить в друзья или отправить запрос
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friend_id } = await request.json();

    if (!friend_id) {
      return NextResponse.json(
        { error: "friend_id is required" },
        { status: 400 }
      );
    }

    if (authUser.id === friend_id) {
      return NextResponse.json(
        { error: "Cannot add yourself as a friend" },
        { status: 400 }
      );
    }

    // Проверяем, существует ли уже запись о дружбе
    const { data: existingFriendship } = await supabase
      .from("friends")
      .select("*")
      .or(`and(user_id.eq.${authUser.id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${authUser.id})`)
      .maybeSingle();

    if (existingFriendship) {
      // Если запрос уже существует
      if (existingFriendship.status === "pending") {
        // Если запрос был отправлен другим пользователем, принимаем его
        if (existingFriendship.user_id === friend_id && existingFriendship.friend_id === authUser.id) {
          const { error } = await supabase
            .from("friends")
            .update({ status: "accepted" })
            .eq("id", existingFriendship.id);

          if (error) throw error;

          return NextResponse.json({
            data: { status: "accepted", friendship: existingFriendship },
            message: "Friend request accepted",
          });
        } else {
          return NextResponse.json(
            { error: "Friend request already sent" },
            { status: 400 }
          );
        }
      } else if (existingFriendship.status === "accepted") {
        return NextResponse.json(
          { error: "Already friends" },
          { status: 400 }
        );
      } else if (existingFriendship.status === "blocked") {
        return NextResponse.json(
          { error: "User is blocked" },
          { status: 400 }
        );
      }
    }

    // Создаем новый запрос в друзья
    const { data: friendship, error } = await supabase
      .from("friends")
      .insert({
        user_id: authUser.id,
        friend_id: friend_id,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      data: friendship,
      message: "Friend request sent",
    });
  } catch (error: any) {
    console.error("Add friend error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add friend" },
      { status: 500 }
    );
  }
}

// DELETE /api/friends - удалить из друзей или отменить запрос
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const friend_id = searchParams.get("friend_id");

    if (!friend_id) {
      return NextResponse.json(
        { error: "friend_id is required" },
        { status: 400 }
      );
    }

    // Удаляем запись о дружбе (в любом направлении)
    const { error } = await supabase
      .from("friends")
      .delete()
      .or(`and(user_id.eq.${authUser.id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${authUser.id})`);

    if (error) throw error;

    return NextResponse.json({
      message: "Friend removed",
    });
  } catch (error: any) {
    console.error("Remove friend error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove friend" },
      { status: 500 }
    );
  }
}

// GET /api/friends?user_id=xxx - получить статус дружбы
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // Проверяем статус дружбы
    const { data: friendship } = await supabase
      .from("friends")
      .select("*")
      .or(`and(user_id.eq.${authUser.id},friend_id.eq.${user_id}),and(user_id.eq.${user_id},friend_id.eq.${authUser.id})`)
      .maybeSingle();

    let status = "none";
    if (friendship) {
      if (friendship.status === "accepted") {
        status = "accepted";
      } else if (friendship.status === "pending") {
        // Определяем, кто отправил запрос
        if (friendship.user_id === authUser.id) {
          status = "pending_sent";
        } else {
          status = "pending_received";
        }
      } else if (friendship.status === "blocked") {
        status = "blocked";
      }
    }

    return NextResponse.json({
      data: { status, friendship },
    });
  } catch (error: any) {
    console.error("Get friendship status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get friendship status" },
      { status: 500 }
    );
  }
}

