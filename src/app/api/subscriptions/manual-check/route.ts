import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";

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
    // Получаем API ключ
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Payment service configuration error" },
        { status: 500 }
      );
    }

    // Получаем все платежи пользователя со статусом waiting, confirming, confirmed
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", authUser.id)
      .in("status", ["waiting", "confirming", "confirmed", "sending"])
      .order("created_at", { ascending: false });

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      return NextResponse.json(
        { error: "Failed to fetch payments", details: paymentsError },
        { status: 500 }
      );
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({
        message: "No pending payments found",
        checked: 0,
        activated: 0,
      });
    }

    console.log(`Checking ${payments.length} payments for user ${authUser.id}`);

    let checked = 0;
    let activated = 0;
    const results: Array<{
      payment_id: string;
      status: string;
      activated: boolean;
      error?: string;
    }> = [];

    // Проверяем каждый платеж в NowPayments
    for (const payment of payments) {
      if (!payment.provider_payment_id) {
        continue;
      }

      try {
        checked++;
        
        // Проверяем статус в NowPayments
        const statusResponse = await fetch(
          `${NOWPAYMENTS_API_URL}/payment/${payment.provider_payment_id}`,
          {
            headers: {
              "x-api-key": apiKey,
            },
          }
        );

        if (!statusResponse.ok) {
          const errorData = await statusResponse.json().catch(() => ({}));
          results.push({
            payment_id: payment.provider_payment_id,
            status: payment.status,
            activated: false,
            error: `Failed to check: ${errorData.message || statusResponse.statusText}`,
          });
          continue;
        }

        const paymentData = await statusResponse.json();
        const newStatus = paymentData.payment_status || payment.status;

        console.log(`Payment ${payment.provider_payment_id}: ${payment.status} -> ${newStatus}`);

        // Обновляем статус платежа в БД
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: newStatus,
            tx_hash: paymentData.tx_hash || payment.tx_hash,
            pay_address: paymentData.pay_address || payment.pay_address,
            pay_amount: paymentData.pay_amount || payment.pay_amount,
            pay_currency: paymentData.pay_currency || payment.pay_currency,
            price_amount: paymentData.price_amount || payment.price_amount,
            price_currency: paymentData.price_currency || payment.price_currency,
            confirmed_at:
              newStatus === "finished" || newStatus === "confirmed"
                ? new Date().toISOString()
                : payment.confirmed_at,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        if (updateError) {
          console.error("Error updating payment:", updateError);
        }

        // Если платеж завершен - активируем подписку
        if (newStatus === "finished" && payment.purchase_id) {
          const planId = payment.purchase_id;

          // Получаем план
          const { data: plan, error: planError } = await supabase
            .from("plans")
            .select("*")
            .eq("id", planId)
            .eq("is_active", true)
            .single();

          if (plan && !planError) {
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
              // Обновляем существующую
              const { error: updateSubError } = await supabase
                .from("subscriptions")
                .update({
                  plan_id: plan.id,
                  status: "active",
                  current_period_end: periodEnd.toISOString(),
                  last_payment_id: payment.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingSubscription.id);

              if (!updateSubError) {
                activated++;
                console.log(`Subscription updated for payment ${payment.provider_payment_id}`);
              }
            } else {
              // Создаем новую
              const { error: insertSubError } = await supabase
                .from("subscriptions")
                .insert({
                  user_id: authUser.id,
                  plan_id: plan.id,
                  status: "active",
                  current_period_end: periodEnd.toISOString(),
                  last_payment_id: payment.id,
                });

              if (!insertSubError) {
                activated++;
                console.log(`Subscription created for payment ${payment.provider_payment_id}`);
              }
            }

            results.push({
              payment_id: payment.provider_payment_id,
              status: newStatus,
              activated: true,
            });
          } else {
            results.push({
              payment_id: payment.provider_payment_id,
              status: newStatus,
              activated: false,
              error: planError?.message || "Plan not found",
            });
          }
        } else {
          results.push({
            payment_id: payment.provider_payment_id,
            status: newStatus,
            activated: false,
          });
        }
      } catch (error) {
        console.error(`Error checking payment ${payment.provider_payment_id}:`, error);
        results.push({
          payment_id: payment.provider_payment_id,
          status: payment.status,
          activated: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: `Checked ${checked} payments, activated ${activated} subscriptions`,
      checked,
      activated,
      results,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}

