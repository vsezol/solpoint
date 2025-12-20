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
    const body = await request.json();
    const { plan_id } = body;

    if (!plan_id) {
      return NextResponse.json(
        { error: "plan_id is required" },
        { status: 400 }
      );
    }

    // Получаем план подписки
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
      order_id: `subscription_${authUser.id}_${plan.id}_${Date.now()}`,
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
      let errorMessage = "Не удалось создать платеж";
      
      if (nowPaymentsResponse.status === 502 || nowPaymentsResponse.status === 503) {
        errorMessage = "Сервис платежей временно недоступен. Пожалуйста, попробуйте позже.";
      } else if (nowPaymentsResponse.status === 401 || nowPaymentsResponse.status === 403) {
        errorMessage = "Ошибка аутентификации в платежном сервисе. Проверьте настройки API ключа.";
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

    // Сохраняем платеж в базу данных
    // Сохраняем plan_id в purchase_id для последующего использования в webhook
    const providerPaymentId = paymentData.payment_id?.toString();
    
    console.log("Saving payment to DB:", {
      provider_payment_id: providerPaymentId,
      user_id: authUser.id,
      plan_id: plan.id,
      order_id: paymentData.order_id,
    });
    
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: authUser.id,
        provider: "nowpayments",
        provider_payment_id: providerPaymentId,
        amount: plan.price,
        currency: plan.currency,
        status: paymentData.payment_status || "waiting",
        pay_address: paymentData.pay_address,
        pay_amount: paymentData.pay_amount,
        pay_currency: paymentData.pay_currency,
        price_amount: paymentData.price_amount,
        price_currency: paymentData.price_currency,
        purchase_id: plan.id, // Сохраняем plan_id для активации подписки в webhook
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error saving payment to DB:", paymentError);
      // Платеж создан в NowPayments, но не сохранен в БД
      // Webhook все равно сможет обработать платеж по payment_id или order_id
    } else {
      console.log("Payment saved successfully:", {
        local_payment_id: payment?.id,
        provider_payment_id: payment?.provider_payment_id,
      });
    }

    // Возвращаем данные для фронтенда
    // Показываем адрес для оплаты и сумму в MATIC
    return NextResponse.json({
      payment_id: paymentData.payment_id,
      pay_address: paymentData.pay_address, // Адрес для отправки MATIC
      pay_amount: paymentData.pay_amount, // Сумма в MATIC
      pay_currency: paymentData.pay_currency?.toUpperCase() || "MATIC",
      price_amount: paymentData.price_amount, // Сумма в USD
      price_currency: paymentData.price_currency?.toUpperCase() || "USD",
      status: paymentData.payment_status || "waiting",
      expires_at: paymentData.expiration_estimate_date,
      order_id: paymentData.order_id,
      local_payment_id: payment?.id,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

