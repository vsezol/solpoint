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

    // Ищем intent по order_id (формат: intent_{intent_id}_{timestamp})
    let intent = null;
    
    if (order_id) {
      console.log("Trying to find intent by order_id:", order_id);
      const orderParts = order_id.split("_");
      if (orderParts.length >= 2 && orderParts[0] === "intent") {
        const intentId = orderParts[1];
        
        const { data: foundIntent, error: intentError } = await supabase
          .from("subscription_intents")
          .select("*")
          .eq("intent_id", intentId)
          .single();
        
        if (foundIntent) {
          intent = foundIntent;
          console.log("Found intent by order_id:", intent.id);
        } else if (intentError && intentError.code !== "PGRST116") {
          console.error("Error fetching intent:", intentError);
          return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
          );
        }
      }
    }
    
    // Если не нашли по order_id, пробуем найти по provider_payment_id
    if (!intent && payment_id) {
      const { data: foundIntent, error: intentError } = await supabase
        .from("subscription_intents")
        .select("*")
        .eq("provider_payment_id", payment_id?.toString())
        .single();
      
      if (foundIntent) {
        intent = foundIntent;
        console.log("Found intent by provider_payment_id:", intent.id);
      } else if (intentError && intentError.code !== "PGRST116") {
        console.error("Error fetching intent:", intentError);
      }
    }

    // Обновляем intent при получении webhook
    if (intent) {
      // Обновляем intent с данными платежа
      const { error: updateIntentError } = await supabase
        .from("subscription_intents")
        .update({
          provider_payment_id: payment_id?.toString() || intent.provider_payment_id,
          updated_at: new Date().toISOString(),
          // Если платеж завершен, обновляем статус на 'paid'
          ...(payment_status === "finished" && { status: "paid" }),
        })
        .eq("id", intent.id);

      if (updateIntentError) {
        console.error("Error updating intent:", updateIntentError);
      } else {
        console.log("Intent updated successfully:", intent.id, "status:", payment_status === "finished" ? "paid" : intent.status);
      }
    } else {
      console.warn("Intent not found for payment_id:", payment_id, "order_id:", order_id);
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

