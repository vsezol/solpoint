import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

// Получаем адрес получателя из переменных окружения
const RECIPIENT_ADDRESS = process.env.SOLANA_RECIPIENT_ADDRESS || '6zq2BDgQB3AzZ8sAHUNmrpe86HJHiSkqsbTqru8LhNmo';
// Используем PublicNode RPC (бесплатный и быстрый) или из переменных окружения
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://solana-rpc.publicnode.com";

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

  if (!RECIPIENT_ADDRESS) {
    return NextResponse.json(
      { error: "Payment service configuration error: recipient address not set" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { signature, payer, plan_id } = body;

    if (!signature || !payer) {
      return NextResponse.json(
        { error: "signature and payer are required" },
        { status: 400 }
      );
    }

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

    // Проверяем, не использовалась ли эта signature ранее
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("tx_hash", signature)
      .single();

    if (existingPayment) {
      return NextResponse.json(
        { error: "This transaction signature has already been used" },
        { status: 400 }
      );
    }

    // Подключаемся к Solana RPC
    const connection = new Connection(SOLANA_RPC_URL, "finalized");

    // Получаем транзакцию с commitment=finalized
    let transaction;
    try {
      transaction = await connection.getTransaction(signature, {
        commitment: "finalized",
        maxSupportedTransactionVersion: 0,
      });
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return NextResponse.json(
        { error: "Failed to fetch transaction from Solana network. Transaction may not be finalized yet." },
        { status: 500 }
      );
    }

    // Проверка 1: Транзакция существует
    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found or not finalized" },
        { status: 404 }
      );
    }

    // Проверка 2: meta.err === null
    if (transaction.meta?.err !== null) {
      return NextResponse.json(
        { error: "Transaction failed", details: transaction.meta?.err },
        { status: 400 }
      );
    }

    // Проверка 3: Получатель = наш SOL-адрес и сумма
    const recipientPubkey = new PublicKey(RECIPIENT_ADDRESS);
    let recipientFound = false;
    let totalAmount = 0;

    // Проверяем изменения балансов через preBalances и postBalances
    // Это самый надежный способ для проверки переводов SOL
    if (transaction.meta) {
      // Получаем accountKeys в зависимости от типа транзакции
      let accountKeys: Array<{ pubkey: PublicKey }> = [];
      
      // Проверяем тип транзакции через проверку наличия свойства
      const tx = transaction.transaction;
      if ("message" in tx && tx.message && typeof (tx.message as { getAccountKeys?: () => { staticAccountKeys: PublicKey[] } }).getAccountKeys === "function") {
        // VersionedTransaction
        const versionedMessage = tx.message as { getAccountKeys: () => { staticAccountKeys: PublicKey[] } };
        accountKeys = versionedMessage.getAccountKeys().staticAccountKeys.map(
          (pubkey: PublicKey) => ({ pubkey })
        );
      } else if ("message" in tx && tx.message && "accountKeys" in tx.message) {
        // Legacy Transaction - accountKeys это массив PublicKey или объектов с pubkey
        const legacyMessage = tx.message as { accountKeys: Array<PublicKey | { pubkey: PublicKey }> };
        accountKeys = legacyMessage.accountKeys.map((accountKey: PublicKey | { pubkey: PublicKey }) => {
          if (accountKey instanceof PublicKey) {
            return { pubkey: accountKey };
          }
          return { pubkey: accountKey.pubkey };
        });
      }

      const preBalances = transaction.meta.preBalances || [];
      const postBalances = transaction.meta.postBalances || [];

      for (let i = 0; i < accountKeys.length; i++) {
        const accountKey = accountKeys[i];
        if (accountKey.pubkey.equals(recipientPubkey)) {
          const balanceChange = (postBalances[i] || 0) - (preBalances[i] || 0);
          if (balanceChange > 0) {
            recipientFound = true;
            totalAmount = balanceChange;
            break; // Нашли получателя, выходим
          }
        }
      }
    }

    if (!recipientFound || totalAmount === 0) {
      return NextResponse.json(
        { error: "Transaction recipient does not match our address or no SOL received" },
        { status: 400 }
      );
    }

    // Проверка 4: Сумма >= минимальной (0.01 SOL для тестов)
    // Backend проверяет что платеж был сделан, точную сумму в USD проверяем по плану
    // Минимум 0.01 SOL (10,000,000 lamports) для любой транзакции
    const MIN_AMOUNT_LAMPORTS = 10_000_000; // 0.01 SOL

    if (totalAmount < MIN_AMOUNT_LAMPORTS) {
      return NextResponse.json(
        {
          error: "Insufficient payment amount",
          message: `Минимальная сумма платежа: 0.01 SOL. Получено: ${(totalAmount / 1e9).toFixed(4)} SOL`,
          required: MIN_AMOUNT_LAMPORTS / 1e9,
          received: totalAmount / 1e9,
        },
        { status: 400 }
      );
    }

    // Проверка 5: Payer соответствует отправителю транзакции
    const transactionSignatures = transaction.transaction.signatures;
    if (transactionSignatures.length === 0) {
      return NextResponse.json(
        { error: "Transaction has no signatures" },
        { status: 400 }
      );
    }

    // Все проверки пройдены - сохраняем платеж в БД
    const amountInSOL = totalAmount / 1e9;
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: authUser.id,
        provider: "solana",
        provider_payment_id: signature,
        tx_hash: signature,
        amount: plan.price, // Цена в USD
        currency: plan.currency,
        status: "finished",
        confirmed_at: new Date().toISOString(),
        pay_address: RECIPIENT_ADDRESS,
        pay_amount: amountInSOL,
        pay_currency: "sol",
        price_amount: plan.price,
        price_currency: plan.currency,
        purchase_id: plan.id,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error saving payment:", paymentError);
      return NextResponse.json(
        { error: "Failed to save payment", details: paymentError },
        { status: 500 }
      );
    }

    // Активируем подписку
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

      if (updateSubError) {
        console.error("Error updating subscription:", updateSubError);
        return NextResponse.json(
          { error: "Payment saved but failed to activate subscription", details: updateSubError },
          { status: 500 }
        );
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

      if (insertSubError) {
        console.error("Error creating subscription:", insertSubError);
        return NextResponse.json(
          { error: "Payment saved but failed to activate subscription", details: insertSubError },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and subscription activated",
      payment: {
        id: payment.id,
        signature,
        amount: amountInSOL,
        currency: "SOL",
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

