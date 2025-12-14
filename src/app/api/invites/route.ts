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

    // Получаем данные из запроса
    const body = await request.json();
    const { max_uses, expires_at } = body;
    
    // Генерируем уникальный код инвайта
    const { data: inviteCode, error: codeError } = await supabase
      .rpc('generate_invite_code');

    if (codeError) {
      console.error("Error generating invite code:", codeError);
      // Fallback: генерируем код на клиенте
      const fallbackCode = Math.random().toString(36).substring(2, 10).toUpperCase() + 
                          Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Проверяем уникальность
      const { data: existing } = await supabase
        .from("invites")
        .select("code")
        .eq("code", fallbackCode)
        .maybeSingle();
      
      if (existing) {
        return NextResponse.json(
          { error: "Failed to generate unique invite code" },
          { status: 500 }
        );
      }

      // Создаем инвайт
      const { data: invite, error: insertError } = await supabase
        .from("invites")
        .insert({
          code: fallbackCode,
          inviter_user_id: user.id,
          max_uses: max_uses || null,
          expires_at: expires_at || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating invite:", insertError);
        return NextResponse.json(
          { error: "Failed to create invite" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: invite }, { status: 201 });
    }

    // Создаем инвайт с сгенерированным кодом
    const { data: invite, error: insertError } = await supabase
      .from("invites")
      .insert({
        code: inviteCode,
        inviter_user_id: user.id,
        max_uses: max_uses || null,
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating invite:", insertError);
      return NextResponse.json(
        { error: "Failed to create invite" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: invite }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/invites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint для получения инвайтов пользователя
export async function GET(request: NextRequest) {
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

    // Получаем все инвайты пользователя с количеством использований
    const { data: invites, error } = await supabase
      .from("invites")
      .select(`
        *,
        referrals(count)
      `)
      .eq("inviter_user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invites:", error);
      return NextResponse.json(
        { error: "Failed to fetch invites" },
        { status: 500 }
      );
    }

    // Добавляем количество использований для каждого invite
    if (invites) {
      for (const invite of invites) {
        const { count } = await supabase
          .from("referrals")
          .select("*", { count: "exact", head: true })
          .eq("invite_id", invite.id);
        
        invite.uses_count = count || 0;
      }
    }

    return NextResponse.json({ data: invites }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/invites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

