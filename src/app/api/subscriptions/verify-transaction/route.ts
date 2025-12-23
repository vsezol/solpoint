import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { tx_signature } = body;

    if (!tx_signature) {
      return NextResponse.json(
        { error: "tx_signature is required" },
        { status: 400 }
      );
    }

    // Ищем intent по signature
    const { data: intent, error: intentError } = await supabase
      .from("subscription_intents")
      .select("*, plans(*)")
      .eq("tx_signature", tx_signature)
      .single();

    if (intentError || !intent) {
      return NextResponse.json(
        { 
          error: "Transaction not found",
          message: "No subscription intent found for this transaction signature. Please verify the signature is correct."
        },
        { status: 404 }
      );
    }

    const plan = intent.plans as any;

    return NextResponse.json({
      found: true,
      intent: {
        intent_id: intent.intent_id,
        email: intent.email,
        status: intent.status,
        plan: plan ? {
          code: plan.code,
          price: plan.price,
          currency: plan.currency,
          interval_days: plan.interval_days,
        } : null,
        created_at: intent.created_at,
        expires_at: intent.expires_at,
        user_id: intent.user_id,
      },
      message: intent.status === "paid" 
        ? "Transaction is paid and ready for activation"
        : intent.status === "claimed"
        ? "Subscription has already been activated"
        : intent.status === "expired"
        ? "Transaction intent has expired"
        : "Transaction is pending payment",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

