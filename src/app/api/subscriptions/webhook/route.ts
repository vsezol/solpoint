import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Функция для проверки подписи NowPayments
function verifyNowPaymentsSignature(
  signature: string,
  body: string,
  secret: string
): boolean {
  try {
    // Парсим JSON
    const data = JSON.parse(body);
    
    // Создаем объект с отсортированными ключами
    const sortedKeys = Object.keys(data).sort();
    const sortedData: Record<string, unknown> = {};
    
    for (const key of sortedKeys) {
      sortedData[key] = data[key];
    }
    
    // Конвертируем обратно в JSON строку (без пробелов)
    const sortedBody = JSON.stringify(sortedData);
    
    // Создаем HMAC SHA-512
    const hmac = crypto.createHmac("sha512", secret);
    hmac.update(sortedBody);
    const calculatedSignature = hmac.digest("hex");
    
    const isValid = calculatedSignature === signature;
    
    if (!isValid) {
      console.error("Signature mismatch:", {
        received: signature?.substring(0, 20) + "...",
        calculated: calculatedSignature.substring(0, 20) + "...",
        bodyLength: sortedBody.length,
      });
    }
    
    return isValid;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    // Получаем подпись из заголовков
    const signature = request.headers.get("x-nowpayments-sig");
    const body = await request.text();

    // Логируем для отладки
    console.log("Webhook received:", {
      hasSignature: !!signature,
      signatureLength: signature?.length,
      bodyLength: body.length,
      bodyPreview: body.substring(0, 200),
    });

    // Получаем IPN secret key из переменных окружения
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (!ipnSecret) {
      console.error("NOWPAYMENTS_IPN_SECRET is not set");
      // В режиме разработки можно временно пропустить проверку
      if (process.env.NODE_ENV === "development") {
        console.warn("⚠️  Skipping signature verification in development mode");
      } else {
        return NextResponse.json(
          { error: "IPN secret not configured" },
          { status: 500 }
        );
      }
    }

    // Проверяем подпись (только если secret установлен)
    if (ipnSecret) {
      if (!signature || !verifyNowPaymentsSignature(signature, body, ipnSecret)) {
        console.error("Invalid signature", {
          receivedSignature: signature?.substring(0, 20) + "...",
          bodyPreview: body.substring(0, 100),
        });
        // Пропускаем проверку только если явно указано в переменной окружения
        if (process.env.SKIP_WEBHOOK_SIGNATURE_CHECK === "true") {
          console.warn("⚠️  Skipping signature verification (SKIP_WEBHOOK_SIGNATURE_CHECK=true)");
        } else {
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
          );
        }
      }
    }

    const paymentData = JSON.parse(body);
    const {
      payment_id,
      payment_status,
      pay_address,
      pay_amount,
      pay_currency,
      price_amount,
      price_currency,
      tx_hash,
      outcome_amount,
      outcome_currency,
      order_id,
    } = paymentData;
    
    console.log("Webhook payment data:", {
      payment_id,
      payment_status,
      order_id,
      price_amount,
      price_currency,
    });

    // Находим платеж в базе данных
    // Пробуем искать как строку и как число, так как NowPayments может вернуть разный формат
    let payment = null;
    let paymentError = null;
    
    // Сначала пробуем как строку
    const { data: paymentByString, error: errorByString } = await supabase
      .from("payments")
      .select("*")
      .eq("provider_payment_id", payment_id?.toString())
      .maybeSingle();
    
    if (paymentByString) {
      payment = paymentByString;
    } else {
      // Если не нашли, пробуем как число
      const { data: paymentByNumber, error: errorByNumber } = await supabase
        .from("payments")
        .select("*")
        .eq("provider_payment_id", payment_id)
        .maybeSingle();
      
      if (paymentByNumber) {
        payment = paymentByNumber;
      } else {
        // Если все еще не нашли, пробуем найти по order_id
        if (order_id) {
          console.log("Trying to find payment by order_id:", order_id);
          // Извлекаем user_id и plan_id из order_id: subscription_{user_id}_{plan_id}_{timestamp}
          const orderParts = order_id.split("_");
          if (orderParts.length >= 3 && orderParts[0] === "subscription") {
            const userId = orderParts[1];
            const planId = orderParts[2];
            
            // Ищем платеж по user_id и plan_id (из purchase_id)
            const { data: paymentByOrder, error: errorByOrder } = await supabase
              .from("payments")
              .select("*")
              .eq("user_id", userId)
              .eq("purchase_id", planId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (paymentByOrder) {
              payment = paymentByOrder;
              console.log("Found payment by order_id:", payment.id);
            } else {
              paymentError = errorByOrder;
            }
          }
        }
        
        if (!payment) {
          paymentError = errorByNumber || errorByString;
        }
      }
    }

    if (paymentError && paymentError.code !== "PGRST116") {
      console.error("Error fetching payment:", paymentError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    // Обновляем или создаем платеж
    const paymentUpdate = {
      status: payment_status,
      tx_hash: tx_hash || payment?.tx_hash,
      pay_address: pay_address || payment?.pay_address,
      pay_amount: pay_amount || payment?.pay_amount,
      pay_currency: pay_currency || payment?.pay_currency,
      price_amount: price_amount || payment?.price_amount,
      price_currency: price_currency || payment?.price_currency,
      outcome_amount: outcome_amount || payment?.outcome_amount,
      outcome_currency: outcome_currency || payment?.outcome_currency,
      confirmed_at:
        payment_status === "finished" || payment_status === "confirmed"
          ? new Date().toISOString()
          : payment?.confirmed_at,
      updated_at: new Date().toISOString(),
    };

    let updatedPayment;
    if (payment) {
      // Обновляем существующий платеж
      const { data, error } = await supabase
        .from("payments")
        .update(paymentUpdate)
        .eq("id", payment.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating payment:", error);
        return NextResponse.json(
          { error: "Failed to update payment" },
          { status: 500 }
        );
      }
      updatedPayment = data;
    } else {
      // Платеж не найден в БД - возможно, он не был сохранен при создании
      // Пробуем создать его сейчас из данных webhook
      if (order_id) {
        const orderParts = order_id.split("_");
        if (orderParts.length >= 3 && orderParts[0] === "subscription") {
          const userId = orderParts[1];
          const planId = orderParts[2];
          
          console.log("Creating payment from webhook data:", {
            payment_id,
            user_id: userId,
            plan_id: planId,
          });
          
          // Создаем платеж из данных webhook
          const { data: newPayment, error: createError } = await supabase
            .from("payments")
            .insert({
              user_id: userId,
              provider: "nowpayments",
              provider_payment_id: payment_id?.toString(),
              amount: price_amount || 0,
              currency: price_currency?.toLowerCase() || "usd",
              status: payment_status || "waiting",
              pay_address: pay_address,
              pay_amount: pay_amount,
              pay_currency: pay_currency,
              price_amount: price_amount,
              price_currency: price_currency,
              tx_hash: tx_hash,
              purchase_id: planId,
            })
            .select()
            .single();
          
          if (newPayment && !createError) {
            console.log("Payment created from webhook:", newPayment.id);
            updatedPayment = newPayment;
          } else {
            console.error("Failed to create payment from webhook:", createError);
            return NextResponse.json({ received: true });
          }
        } else {
          console.warn("Payment not found and cannot create from order_id:", order_id);
          return NextResponse.json({ received: true });
        }
      } else {
        console.warn("Payment not found in database, payment_id:", payment_id, "order_id:", order_id);
        return NextResponse.json({ received: true });
      }
    }

    // Если платеж завершен (finished), активируем подписку в нашей БД
    if (
      payment_status === "finished" &&
      updatedPayment?.user_id &&
      updatedPayment?.provider_payment_id
    ) {
      console.log("Payment finished, activating subscription for user:", updatedPayment.user_id);
      
      // Получаем plan_id из purchase_id (мы сохранили его там при создании платежа)
      const planId = updatedPayment.purchase_id;
      
      if (!planId) {
        console.error("Plan ID not found in payment, purchase_id:", updatedPayment.purchase_id);
        return NextResponse.json({ received: true });
      }

      // Получаем план подписки
      const { data: plan, error: planError } = await supabase
        .from("plans")
        .select("*")
        .eq("id", planId)
        .eq("is_active", true)
        .single();

      if (planError || !plan) {
        console.error("Plan not found:", planError, "planId:", planId);
        return NextResponse.json({ received: true });
      }

      // Вычисляем дату окончания подписки
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + plan.interval_days);

      // Проверяем, есть ли уже активная подписка
      const { data: existingSubscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", updatedPayment.user_id)
        .eq("status", "active")
        .gt("current_period_end", new Date().toISOString())
        .maybeSingle();

      if (existingSubscription) {
        // Обновляем существующую подписку (продлеваем)
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            plan_id: plan.id,
            status: "active",
            current_period_end: periodEnd.toISOString(),
            last_payment_id: updatedPayment.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSubscription.id);
        
        if (updateError) {
          console.error("Error updating subscription:", updateError);
        } else {
          console.log("Subscription updated successfully:", existingSubscription.id);
        }
      } else {
        // Создаем новую подписку
        const { data: newSubscription, error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            user_id: updatedPayment.user_id,
            plan_id: plan.id,
            status: "active",
            current_period_end: periodEnd.toISOString(),
            last_payment_id: updatedPayment.id,
          })
          .select()
          .single();
        
        if (insertError) {
          console.error("Error creating subscription:", insertError);
        } else {
          console.log("Subscription created successfully:", newSubscription?.id);
        }
      }
    } else if (payment_status === "finished") {
      console.warn("Payment finished but missing required data:", {
        hasUserId: !!updatedPayment?.user_id,
        hasPaymentId: !!updatedPayment?.provider_payment_id,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

