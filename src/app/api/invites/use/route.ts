import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Получаем invite код из запроса
    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь еще не использовал invite код
    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("id")
      .eq("invited_user_id", user.id)
      .single();

    if (existingReferral) {
      return NextResponse.json(
        { error: "User has already used an invite code" },
        { status: 400 }
      );
    }

    // Находим инвайт по коду
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("*")
      .eq("code", inviteCode)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 400 }
      );
    }

    // Проверяем, что инвайт не истек (только если expires_at задан)
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invite code has expired" },
        { status: 400 }
      );
    }

    // Проверяем количество использований (только если max_uses задан)
    if (invite.max_uses !== null && invite.max_uses !== undefined) {
      const { count } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("invite_id", invite.id);

      if (count !== null && count >= invite.max_uses) {
        return NextResponse.json(
          { error: "Invite code has reached maximum uses" },
          { status: 400 }
        );
      }
    }

    // Проверяем, что пользователь не приглашает сам себя
    if (invite.inviter_user_id === user.id) {
      return NextResponse.json(
        { error: "Cannot use your own invite code" },
        { status: 400 }
      );
    }

    // Создаем referral
    const { data: referral, error: referralError } = await supabase
      .from("referrals")
      .insert({
        invite_id: invite.id,
        inviter_user_id: invite.inviter_user_id,
        invited_user_id: user.id,
      })
      .select()
      .single();

    if (referralError) {
      console.error("Error creating referral:", referralError);
      return NextResponse.json(
        { error: "Failed to create referral" },
        { status: 500 }
      );
    }

    // Создаем взаимные подписки между пользователями (оба направления)
    // Это автоматически создаст взаимную дружбу через view mutual_friends
    // Используем функцию БД для надежности (обходит RLS и обрабатывает дубликаты)
    const { error: friendshipError } = await supabase.rpc('create_mutual_friendship', {
      p_user_id_1: invite.inviter_user_id,
      p_user_id_2: user.id,
    });

    if (friendshipError) {
      console.error("Error creating mutual friendship:", friendshipError);
      // Не прерываем выполнение, так как referral уже создан
      // Взаимная дружба - это дополнительная функция
    }

    return NextResponse.json({ data: referral }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/invites/use:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

