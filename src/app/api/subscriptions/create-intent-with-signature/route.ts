import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const supabase = await createClient();

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-intent-with-signature:6',message:'API endpoint called',data:{timestamp:new Date().toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  try {
    const body = await request.json();
    const { plan_id, email, tx_signature } = body;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-intent-with-signature:11',message:'Request body parsed',data:{plan_id,email:email?.substring(0,5)+'***',tx_signature:tx_signature?.substring(0,10)+'***'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

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

    // Рассчитываем ожидаемую сумму в SOL
    // Получаем актуальный курс SOL из CoinGecko
    let solPriceUSD = 100; // Fallback
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

    // Рассчитываем сумму в SOL с буфером 5%
    const amountInSOL = plan.price / solPriceUSD;
    const amountWithBuffer = amountInSOL * 1.05;
    const finalAmount = Math.max(amountWithBuffer, 0.01);
    const expectedAmountLamports = Math.ceil(finalAmount * 1e9);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-intent-with-signature:91',message:'Calculated expected amount',data:{solPriceUSD,amountInSOL,amountWithBuffer,finalAmount,expectedAmountLamports},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Генерируем уникальный intent_id
    const intentId = randomBytes(16).toString("hex");

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-intent-with-signature:95',message:'Generated intent_id',data:{intentId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Создаем intent с истечением через 15 минут и signature
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-intent-with-signature:100',message:'Before insert intent',data:{intentId,plan_id:plan.id,email:email.toLowerCase().trim(),expectedAmountLamports,expires_at:expiresAt.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Пытаемся создать intent с expected_amount_lamports
    // Если колонка отсутствует (ошибка PGRST204), создаем без неё
    const baseInsertData = {
      intent_id: intentId,
      plan_id: plan.id,
      email: email.toLowerCase().trim(),
      status: "pending" as const,
      tx_signature: tx_signature,
      provider: "solana" as const,
      expires_at: expiresAt.toISOString(),
    };

    // Сначала пытаемся с expected_amount_lamports
    let { data: intent, error: intentError } = await supabase
      .from("subscription_intents")
      .insert({
        ...baseInsertData,
        expected_amount_lamports: expectedAmountLamports,
      })
      .select()
      .single();

    // Если ошибка связана с отсутствием колонки (PGRST204), пробуем без неё
    if (intentError && intentError.code === 'PGRST204' && intentError.message?.includes('expected_amount_lamports')) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-intent-with-signature:130',message:'Column expected_amount_lamports not found, retrying without it',data:{error:intentError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      const retryResult = await supabase
        .from("subscription_intents")
        .insert(baseInsertData)
        .select()
        .single();
      
      intent = retryResult.data;
      intentError = retryResult.error;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-intent-with-signature:115',message:'After insert intent',data:{intentError:intentError?{code:intentError.code,message:intentError.message,details:intentError.details}:null,intent:intent?{id:intent.id,intent_id:intent.intent_id}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (intentError) {
      console.error("Error creating intent:", intentError);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-intent-with-signature:117',message:'Intent creation failed',data:{error:intentError,expectedAmountLamports,tx_signature:tx_signature?.substring(0,10)+'***'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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

