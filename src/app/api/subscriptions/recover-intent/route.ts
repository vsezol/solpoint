import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * Endpoint для восстановления intent после неудачного создания
 * Используется когда транзакция уже отправлена, но intent не был создан
 */
export async function POST(request: Request) {
  const supabase = await createClient();


  try {
    const body = await request.json();
    const { plan_id, email, tx_signature } = body;

    if (!plan_id || !email || !tx_signature) {
      return NextResponse.json(
        { error: "plan_id, email, and tx_signature are required" },
        { status: 400 }
      );
    }

    // Проверяем, не создан ли уже intent с этой signature
    const { data: existingIntent } = await supabase
      .from("subscription_intents")
      .select("intent_id, status")
      .eq("tx_signature", tx_signature)
      .single();

    if (existingIntent) {
      return NextResponse.json({
        intent_id: existingIntent.intent_id,
        recovered: true,
      });
    }

    // Получаем план
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

    // Рассчитываем ожидаемую сумму в SOL
    let solPriceUSD = 100;
    try {
      const priceResponse = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
        { next: { revalidate: 60 } }
      );
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        solPriceUSD = priceData.solana?.usd || 100;
      }
    } catch (error) {
      console.warn("Failed to fetch SOL price, using fallback:", error);
    }

    const amountInSOL = plan.price / solPriceUSD;
    const amountWithBuffer = amountInSOL * 1.05;
    const finalAmount = Math.max(amountWithBuffer, 0.01);
    const expectedAmountLamports = Math.ceil(finalAmount * 1e9);

    // Генерируем уникальный intent_id
    const intentId = randomBytes(16).toString("hex");

    // Создаем intent с истечением через 15 минут
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const baseInsertData = {
      intent_id: intentId,
      plan_id: plan.id,
      email: email.toLowerCase().trim(),
      status: "pending" as const,
      tx_signature: tx_signature,
      provider: "solana" as const,
      expires_at: expiresAt.toISOString(),
    };

    // Пытаемся создать intent с expected_amount_lamports
    let { data: intent, error: intentError } = await supabase
      .from("subscription_intents")
      .insert({
        ...baseInsertData,
        expected_amount_lamports: expectedAmountLamports,
      })
      .select()
      .single();

    // Если колонка отсутствует, создаем без неё
    if (intentError && intentError.code === 'PGRST204' && intentError.message?.includes('expected_amount_lamports')) {
      
      const retryResult = await supabase
        .from("subscription_intents")
        .insert(baseInsertData)
        .select()
        .single();
      
      intent = retryResult.data;
      intentError = retryResult.error;
    }

    if (intentError || !intent) {
      return NextResponse.json(
        { error: "Failed to recover intent", details: intentError },
        { status: 500 }
      );
    }


    return NextResponse.json({
      intent_id: intent.intent_id,
      plan_id: intent.plan_id,
      email: intent.email,
      tx_signature: intent.tx_signature,
      expires_at: intent.expires_at,
      recovered: true,
    });
  } catch (error) {
    console.error("Unexpected error in recover-intent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

