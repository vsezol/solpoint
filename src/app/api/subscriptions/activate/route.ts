import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { intent_id } = body;

    if (!intent_id) {
      return NextResponse.json(
        { error: "intent_id is required" },
        { status: 400 }
      );
    }

    // Получаем intent
    const { data: intent, error: intentError } = await supabase
      .from("subscription_intents")
      .select("*, plans(*)")
      .eq("intent_id", intent_id)
      .single();

    if (intentError || !intent) {
      return NextResponse.json(
        { error: "Intent not found" },
        { status: 404 }
      );
    }

    // Проверяем статус intent
    if (intent.status !== "paid") {
      return NextResponse.json(
        { error: `Intent is not paid. Current status: ${intent.status}` },
        { status: 400 }
      );
    }

    // Проверяем, не истек ли intent
    if (new Date(intent.expires_at) < new Date()) {
      await supabase
        .from("subscription_intents")
        .update({ status: "expired" })
        .eq("id", intent.id);
      
      return NextResponse.json(
        { error: "Intent has expired" },
        { status: 400 }
      );
    }

    // Проверяем, не активирован ли уже intent
    if (intent.user_id) {
      return NextResponse.json(
        { error: "This subscription has already been activated" },
        { status: 400 }
      );
    }

    const plan = intent.plans as any;
    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found for this intent" },
        { status: 404 }
      );
    }

    // Обновляем intent: привязываем к user_id и меняем статус на 'claimed'
    const { error: updateIntentError } = await supabase
      .from("subscription_intents")
      .update({
        user_id: authUser.id,
        status: "claimed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", intent.id);

    if (updateIntentError) {
      console.error("Error updating intent:", updateIntentError);
      return NextResponse.json(
        { error: "Failed to update intent", details: updateIntentError },
        { status: 500 }
      );
    }

    // Создаем платеж (если еще не создан)
    let payment = null;
    if (intent.tx_signature || intent.provider_payment_id) {
      // Проверяем, существует ли уже платеж
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("*")
        .or(
          intent.tx_signature
            ? `tx_hash.eq.${intent.tx_signature}`
            : `provider_payment_id.eq.${intent.provider_payment_id}`
        )
        .maybeSingle();

      if (!existingPayment) {
        // Создаем платеж
        const { data: newPayment, error: paymentError } = await supabase
          .from("payments")
          .insert({
            user_id: authUser.id,
            provider: intent.provider || "unknown",
            provider_payment_id: intent.provider_payment_id,
            tx_hash: intent.tx_signature,
            amount: plan.price,
            currency: plan.currency,
            status: "finished",
            confirmed_at: new Date().toISOString(),
            purchase_id: plan.id,
          })
          .select()
          .single();

        if (paymentError) {
          console.error("Error creating payment:", paymentError);
          // Продолжаем даже если платеж не создан
        } else {
          payment = newPayment;
        }
      } else {
        payment = existingPayment;
      }
    }

    // Вычисляем дату окончания подписки
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + plan.interval_days);

    // Проверяем существующую подписку
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", authUser.id)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .maybeSingle();

    if (existingSubscription) {
      // Обновляем существующую подписку
      const { error: updateSubError } = await supabase
        .from("subscriptions")
        .update({
          plan_id: plan.id,
          status: "active",
          current_period_end: periodEnd.toISOString(),
          last_payment_id: payment?.id || existingSubscription.last_payment_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSubscription.id);

      if (updateSubError) {
        console.error("Error updating subscription:", updateSubError);
        return NextResponse.json(
          { error: "Failed to activate subscription", details: updateSubError },
          { status: 500 }
        );
      }
    } else {
      // Создаем новую подписку
      const { error: insertSubError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: authUser.id,
          plan_id: plan.id,
          status: "active",
          current_period_end: periodEnd.toISOString(),
          last_payment_id: payment?.id,
        });

      if (insertSubError) {
        console.error("Error creating subscription:", insertSubError);
        return NextResponse.json(
          { error: "Failed to activate subscription", details: insertSubError },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Subscription activated successfully",
      subscription: {
        plan_id: plan.id,
        plan_code: plan.code,
        period_end: periodEnd.toISOString(),
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}

