import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";

export async function POST(request: Request) {
  const supabase = await createClient();

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
    if (intent.status !== "pending") {
      return NextResponse.json(
        { error: `Intent is not pending. Current status: ${intent.status}` },
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

    const plan = intent.plans as any;
    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found for this intent" },
        { status: 404 }
      );
    }

    // Получаем API ключ из переменных окружения
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      console.error("NOWPAYMENTS_API_KEY is not set");
      return NextResponse.json(
        { error: "Payment service configuration error" },
        { status: 500 }
      );
    }

    // Формируем URL для webhook callback
    // Используем переменную окружения для Ngrok или берем origin из заголовков
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    const origin = baseUrl || request.headers.get("origin") || "http://localhost:3000";
    const ipnCallbackUrl = `${origin}/api/subscriptions/webhook`;

    // Пробуем найти подходящую валюту с минимальным порогом
    // Список валют от меньшего к большему минимуму
    const currenciesToTry = ["trx", "usdt", "usdc", "dai", "matic", "bnb"];
    let payCurrency = "trx"; // По умолчанию
    let foundCurrency = false;

    // Проверяем минимальные суммы для разных валют
    for (const currency of currenciesToTry) {
      try {
        const minAmountResponse = await fetch(
          `${NOWPAYMENTS_API_URL}/min-amount?currency_from=${plan.currency.toUpperCase()}&currency_to=${currency.toUpperCase()}`,
          {
            headers: {
              "x-api-key": apiKey,
            },
          }
        );

        if (minAmountResponse.ok) {
          const minAmountData = await minAmountResponse.json();
          const minAmount = parseFloat(minAmountData.min_amount || "999999");
          
          console.log(`Min amount for ${currency}: $${minAmount}`);
          
          if (plan.price >= minAmount) {
            payCurrency = currency;
            foundCurrency = true;
            console.log(`Using ${currency} for $${plan.price} (min: $${minAmount})`);
            break;
          }
        }
      } catch (error) {
        console.warn(`Failed to check min amount for ${currency}:`, error);
        continue;
      }
    }

    if (!foundCurrency) {
      // Если не нашли подходящую валюту, используем TRX и покажем ошибку если не пройдет
      payCurrency = "trx";
      console.warn(`Could not find suitable currency, using TRX as fallback`);
    }

    // Создаем обычный платеж через NowPayments API
    // Управляем подписками сами в своей БД
    const createPaymentBody = (currency: string) => ({
      price_amount: plan.price,
      price_currency: plan.currency.toUpperCase(), // USD
      pay_currency: currency,
      order_id: `intent_${intent.intent_id}_${Date.now()}`,
      order_description: `Subscription: ${plan.code} plan (${plan.interval_days} days)`,
      ipn_callback_url: ipnCallbackUrl,
      is_fee_paid_by_user: true, // Комиссия за счет клиента
    });

    const paymentBody = createPaymentBody(payCurrency);

    console.log("Creating payment with NowPayments:", {
      price_amount: paymentBody.price_amount,
      price_currency: paymentBody.price_currency,
      pay_currency: paymentBody.pay_currency,
      order_id: paymentBody.order_id,
    });

    const nowPaymentsResponse = await fetch(
      `${NOWPAYMENTS_API_URL}/payment`,
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentBody),
      }
    );

    console.log("NowPayments response status:", nowPaymentsResponse.status, nowPaymentsResponse.statusText);

    if (!nowPaymentsResponse.ok) {
      let errorData: { code?: string; message?: string; status?: number; statusText?: string; [key: string]: unknown } = {};
      const responseText = await nowPaymentsResponse.text();
      
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { 
          message: responseText || `HTTP ${nowPaymentsResponse.status} ${nowPaymentsResponse.statusText}`,
          status: nowPaymentsResponse.status,
          statusText: nowPaymentsResponse.statusText,
        };
      }
      
      console.error("NowPayments API error:", {
        status: nowPaymentsResponse.status,
        statusText: nowPaymentsResponse.statusText,
        error: errorData,
        responseText: responseText.substring(0, 500), // Первые 500 символов
      });
      
      // Обрабатываем ошибку минимальной суммы
      if (errorData.code === 'AMOUNT_MINIMAL_ERROR' || 
          errorData.code === 'BAD_REQUEST' ||
          errorData.message?.includes('too small') ||
          errorData.message?.includes('amountTo is too small')) {
        
        // Пробуем другие валюты с меньшим минимумом
        const fallbackCurrencies = ["usdt", "usdc", "dai", "trx"];
        let retrySuccess = false;
        
        for (const fallbackCurrency of fallbackCurrencies) {
          if (fallbackCurrency === payCurrency) {
            console.log(`Skipping ${fallbackCurrency} - already tried`);
            continue; // Пропускаем уже попробованную
          }
          
          console.log(`Retrying with ${fallbackCurrency} for small amount...`);
          
          // Повторяем запрос с другой валютой
          const retryPaymentBody = createPaymentBody(fallbackCurrency);
          
          const retryResponse = await fetch(
            `${NOWPAYMENTS_API_URL}/payment`,
            {
              method: "POST",
              headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(retryPaymentBody),
            }
          );
          
          if (retryResponse.ok) {
            const retryPaymentData = await retryResponse.json();
            console.log(`Payment created with ${fallbackCurrency}:`, retryPaymentData.payment_id);
            
            // Сохраняем платеж в БД
            const { data: payment } = await supabase
              .from("payments")
              .insert({
                user_id: authUser.id,
                provider: "nowpayments",
                provider_payment_id: retryPaymentData.payment_id?.toString(),
                amount: plan.price,
                currency: plan.currency,
                status: retryPaymentData.payment_status || "waiting",
                pay_address: retryPaymentData.pay_address,
                pay_amount: retryPaymentData.pay_amount,
                pay_currency: retryPaymentData.pay_currency,
                price_amount: retryPaymentData.price_amount,
                price_currency: retryPaymentData.price_currency,
                purchase_id: plan.id,
              })
              .select()
              .single();
            
            retrySuccess = true;
            return NextResponse.json({
              payment_id: retryPaymentData.payment_id,
              pay_address: retryPaymentData.pay_address,
              pay_amount: retryPaymentData.pay_amount,
              pay_currency: retryPaymentData.pay_currency?.toUpperCase() || fallbackCurrency.toUpperCase(),
              price_amount: retryPaymentData.price_amount,
              price_currency: retryPaymentData.price_currency?.toUpperCase() || "USD",
              status: retryPaymentData.payment_status || "waiting",
              expires_at: retryPaymentData.expiration_estimate_date,
              order_id: retryPaymentData.order_id,
              local_payment_id: payment?.id,
            });
          } else {
            const retryErrorText = await retryResponse.text();
            let retryError = {};
            try {
              retryError = retryErrorText ? JSON.parse(retryErrorText) : {};
            } catch {
              retryError = { message: retryErrorText };
            }
            console.log(`${fallbackCurrency} also failed:`, retryError);
          }
        }
        
        // Если все валюты не подошли
        if (!retrySuccess) {
          return NextResponse.json(
            {
              error: "Amount too small",
              message: `Сумма платежа ($${plan.price}) слишком мала для всех доступных валют в NowPayments. Минимальная сумма обычно составляет $3-5 USD. Пожалуйста, выберите план с большей стоимостью или увеличьте цену текущего плана.`,
              code: errorData.code || "AMOUNT_TOO_SMALL",
              details: errorData,
            },
            { status: 400 }
          );
        }
      }
      
      // Обрабатываем разные типы ошибок
      let errorMessage = "Failed to create payment";
      
      if (nowPaymentsResponse.status === 502 || nowPaymentsResponse.status === 503) {
        errorMessage = "Payment service is temporarily unavailable. Please try again later.";
      } else if (nowPaymentsResponse.status === 401 || nowPaymentsResponse.status === 403) {
        errorMessage = "Authentication error in payment service. Check your API key settings.";
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
      
      return NextResponse.json(
        { 
          error: "Failed to create payment", 
          message: errorMessage,
          details: errorData,
          status: nowPaymentsResponse.status,
        },
        { status: nowPaymentsResponse.status >= 500 ? 503 : nowPaymentsResponse.status }
      );
    }

    const paymentData = await nowPaymentsResponse.json();
    
    // Логируем ответ от NowPayments для отладки
    console.log("NowPayments payment created:", {
      payment_id: paymentData.payment_id,
      pay_address: paymentData.pay_address,
      pay_amount: paymentData.pay_amount,
      pay_currency: paymentData.pay_currency,
      payment_status: paymentData.payment_status,
      order_id: paymentData.order_id,
    });

    // Обновляем intent с provider_payment_id
    const providerPaymentId = paymentData.payment_id?.toString();
    
    console.log("Updating intent with payment info:", {
      intent_id: intent.intent_id,
      provider_payment_id: providerPaymentId,
      order_id: paymentData.order_id,
    });
    
    const { error: updateIntentError } = await supabase
      .from("subscription_intents")
      .update({
        provider: "nowpayments",
        provider_payment_id: providerPaymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intent.id);

    if (updateIntentError) {
      console.error("Error updating intent:", updateIntentError);
      // Платеж создан в NowPayments, но intent не обновлен
      // Webhook все равно сможет обработать платеж по order_id
    } else {
      console.log("Intent updated successfully with payment info");
    }

    // Возвращаем данные для фронтенда
    // Показываем адрес для оплаты и сумму
    return NextResponse.json({
      payment_id: paymentData.payment_id,
      pay_address: paymentData.pay_address,
      pay_amount: paymentData.pay_amount,
      pay_currency: paymentData.pay_currency?.toUpperCase() || "MATIC",
      price_amount: paymentData.price_amount,
      price_currency: paymentData.price_currency?.toUpperCase() || "USD",
      status: paymentData.payment_status || "waiting",
      expires_at: paymentData.expiration_estimate_date,
      order_id: paymentData.order_id,
      intent_id: intent.intent_id,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

