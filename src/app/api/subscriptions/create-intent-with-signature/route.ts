import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { plan_id, email, tx_signature } = body;

    if (!plan_id) {
      return NextResponse.json(
        { error: "plan_id is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    if (!tx_signature) {
      return NextResponse.json(
        { error: "tx_signature is required" },
        { status: 400 }
      );
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Проверяем существование плана
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Plan not found or inactive" },
        { status: 404 }
      );
    }

    // Проверяем, не использовалась ли эта signature ранее
    const { data: existingIntent } = await supabase
      .from("subscription_intents")
      .select("id")
      .eq("tx_signature", tx_signature)
      .single();

    if (existingIntent) {
      return NextResponse.json(
        { error: "This transaction signature has already been used" },
        { status: 400 }
      );
    }

    // Генерируем уникальный intent_id
    const intentId = randomBytes(16).toString("hex");

    // Создаем intent с истечением через 15 минут и signature
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const { data: intent, error: intentError } = await supabase
      .from("subscription_intents")
      .insert({
        intent_id: intentId,
        plan_id: plan.id,
        email: email.toLowerCase().trim(),
        status: "pending",
        tx_signature: tx_signature,
        provider: "solana",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (intentError) {
      console.error("Error creating intent:", intentError);
      return NextResponse.json(
        { error: "Failed to create intent", details: intentError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      intent_id: intent.intent_id,
      plan_id: intent.plan_id,
      email: intent.email,
      tx_signature: intent.tx_signature,
      expires_at: intent.expires_at,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

