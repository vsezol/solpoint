import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "code parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Получаем intent с планом
    const { data: intent, error: intentError } = await supabase
      .from("subscription_intents")
      .select("*, plans(*)")
      .eq("intent_id", code)
      .single();

    if (intentError || !intent) {
      return NextResponse.json(
        { error: "Intent not found" },
        { status: 404 }
      );
    }

    // Возвращаем intent (без чувствительных данных)
    return NextResponse.json({
      intent: {
        id: intent.id,
        intent_id: intent.intent_id,
        email: intent.email,
        status: intent.status,
        tx_signature: intent.tx_signature, // Нужно для проверки транзакции
        expires_at: intent.expires_at,
        created_at: intent.created_at,
        plans: intent.plans,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

