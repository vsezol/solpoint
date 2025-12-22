import { NextResponse } from "next/server";

// Получаем актуальный курс SOL/USD из CoinGecko API
async function getSOLPrice(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      {
        next: { revalidate: 60 }, // Кешируем на 60 секунд
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch SOL price");
    }

    const data = await response.json();
    return data.solana?.usd || 100; // Fallback на $100 если API недоступен
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    // Fallback на значение из env или дефолтное
    return parseFloat(process.env.SOL_PRICE_USD || "100");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan_id } = body;

    if (!plan_id) {
      return NextResponse.json(
        { error: "plan_id is required" },
        { status: 400 }
      );
    }

    // Получаем план из БД
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    // Получаем актуальный курс SOL
    const solPriceUSD = await getSOLPrice();

    // Рассчитываем сумму в SOL
    const amountInSOL = plan.price / solPriceUSD;
    // Добавляем буфер 5% для учета колебаний курса
    const amountWithBuffer = amountInSOL * 1.05;
    // Минимум 0.01 SOL
    const finalAmount = Math.max(amountWithBuffer, 0.01);

    return NextResponse.json({
      plan_id: plan.id,
      plan_price_usd: plan.price,
      sol_price_usd: solPriceUSD,
      amount_sol: finalAmount,
      amount_lamports: Math.ceil(finalAmount * 1e9),
      buffer_percent: 5,
    });
  } catch (error) {
    console.error("Error calculating SOL amount:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

