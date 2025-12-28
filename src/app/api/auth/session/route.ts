import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/session
 * Получить текущую сессию пользователя
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Используем getUser() вместо getSession() для безопасности
    // getUser() проверяет данные на сервере Supabase Auth, а не просто читает из cookies
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { session: null, error: error?.message },
        { status: 200 } // Возвращаем 200, но с session: null
      );
    }

    return NextResponse.json({
      session: {
        user: {
          id: user.id,
          email: user.email,
          // Только минимальные данные, остальное через /api/auth/me
        },
      },
    });
  } catch (error: any) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { session: null, error: error.message || "Failed to get session" },
      { status: 200 } // Возвращаем 200, но с session: null
    );
  }
}

