import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

// Получаем адрес получателя из переменных окружения
const RECIPIENT_ADDRESS = process.env.SOLANA_RECIPIENT_ADDRESS || '6zq2BDgQB3AzZ8sAHUNmrpe86HJHiSkqsbTqru8LhNmo';
// Используем PublicNode RPC (бесплатный и быстрый) или из переменных окружения
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://solana-rpc.publicnode.com";

export async function POST(request: Request) {
  const supabase = await createClient();

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'solana-payment:10',message:'API endpoint called',data:{timestamp:new Date().toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  if (!RECIPIENT_ADDRESS) {
    return NextResponse.json(
      { error: "Payment service configuration error: recipient address not set" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { signature, payer, intent_id } = body;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'solana-payment:22',message:'Request body parsed',data:{signature:signature?.substring(0,10)+'***',payer,intent_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    if (!signature || !payer) {
      return NextResponse.json(
        { error: "signature and payer are required" },
        { status: 400 }
      );
    }

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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'solana-payment:39',message:'Intent fetched',data:{intentFound:!!intent,intentError:intentError?.message,intentId:intent?.id,intentSignature:intent?.tx_signature?.substring(0,10)+'***'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    if (intentError || !intent) {
      return NextResponse.json(
        { error: "Intent not found" },
        { status: 404 }
      );
    }

    // Проверяем, что signature в запросе совпадает с signature в intent
    if (intent.tx_signature !== signature) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'solana-payment:53',message:'Signature mismatch',data:{intentSignature:intent.tx_signature?.substring(0,10)+'***',requestSignature:signature?.substring(0,10)+'***'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: "Transaction signature does not match the intent. Please use the correct transaction." },
        { status: 400 }
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

    const plan = intent.plans as {
      id: string;
      code: string;
      price: number;
      currency: string;
      interval_days: number;
    } | null;
    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found for this intent" },
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

    // Проверяем, не использовалась ли эта signature в ДРУГОМ intent (исключаем текущий)
    const { data: existingIntent } = await supabase
      .from("subscription_intents")
      .select("id, intent_id")
      .eq("tx_signature", signature)
      .neq("id", intent.id) // ИСКЛЮЧАЕМ текущий intent из проверки!
      .single();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'solana-payment:109',message:'Checking for duplicate signature',data:{existingIntentFound:!!existingIntent,currentIntentId:intent.id,existingIntentId:existingIntent?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    if (existingIntent) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'solana-payment:116',message:'Duplicate signature found in another intent',data:{currentIntentId:intent.id,existingIntentId:existingIntent.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: "This transaction signature has already been used in another intent" },
        { status: 400 }
      );
    }

    // Подключаемся к Solana RPC
    const connection = new Connection(SOLANA_RPC_URL, "finalized");

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'solana-payment:147',message:'Fetching transaction from Solana',data:{signature:signature?.substring(0,10)+'***',rpcUrl:SOLANA_RPC_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    // Получаем транзакцию - сначала пробуем confirmed, потом finalized
    let transaction = null;
    let transactionError = null;
    
    // Пробуем сначала confirmed (быстрее)
    try {
      transaction = await Promise.race([
        connection.getTransaction(signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        }),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error("timeout")), 10000)
        )
      ]);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'solana-payment:160',message:'Transaction found with confirmed commitment',data:{txFound:!!transaction,txSlot:transaction?.slot},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      transactionError = error;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'solana-payment:167',message:'Failed to fetch with confirmed, trying finalized',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      // Если не получилось с confirmed, пробуем finalized
      try {
        transaction = await Promise.race([
          connection.getTransaction(signature, {
            commitment: "finalized",
            maxSupportedTransactionVersion: 0,
          }),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error("timeout")), 15000)
          )
        ]);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'solana-payment:180',message:'Transaction found with finalized commitment',data:{txFound:!!transaction,txSlot:transaction?.slot},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
      } catch (finalizedError) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'solana-payment:186',message:'Failed to fetch transaction with both commitments',data:{confirmedError:transactionError instanceof Error ? transactionError.message : String(transactionError),finalizedError:finalizedError instanceof Error ? finalizedError.message : String(finalizedError)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        console.error("Error fetching transaction:", finalizedError);
        // Если intent уже создан, возвращаем специальный ответ для активации
        return NextResponse.json(
          { 
            error: "Transaction not found or not finalized yet",
            intent_id: intent.intent_id,
            can_activate: true,
            message: "Your payment intent has been created. The transaction may still be processing. You can try to activate your subscription."
          },
          { status: 404 }
        );
      }
    }

    // Проверка 1: Транзакция существует
    if (!transaction) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/611c1467-114d-452c-bfd5-d57fb145b7c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'solana-payment:201',message:'Transaction is null',data:{intentId:intent.intent_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      // Если intent уже создан, возвращаем специальный ответ для активации
      return NextResponse.json(
        { 
          error: "Transaction not found or not finalized",
          intent_id: intent.intent_id,
          can_activate: true,
          message: "Your payment intent has been created. The transaction may still be processing. You can try to activate your subscription."
        },
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

    // Проверка 4: Сумма соответствует ожидаемой (с допуском ±10%)
    if (intent.expected_amount_lamports) {
      const expectedAmount = intent.expected_amount_lamports;
      const minAmount = Math.floor(expectedAmount * 0.9); // -10% допуск
      const maxAmount = Math.ceil(expectedAmount * 1.1);  // +10% допуск

      if (totalAmount < minAmount || totalAmount > maxAmount) {
        return NextResponse.json(
          {
            error: "Payment amount does not match the plan price",
            message: `Expected amount: ${(expectedAmount / 1e9).toFixed(4)} SOL (±10%). Received: ${(totalAmount / 1e9).toFixed(4)} SOL`,
            expected: expectedAmount / 1e9,
            received: totalAmount / 1e9,
            min: minAmount / 1e9,
            max: maxAmount / 1e9,
          },
          { status: 400 }
        );
      }
    } else {
      // Fallback: проверяем минимальную сумму если expected_amount не сохранен
      const MIN_AMOUNT_LAMPORTS = 10_000_000; // 0.01 SOL
      if (totalAmount < MIN_AMOUNT_LAMPORTS) {
        return NextResponse.json(
          {
            error: "Insufficient payment amount",
            message: `Minimum payment amount: 0.01 SOL. Received: ${(totalAmount / 1e9).toFixed(4)} SOL`,
            required: MIN_AMOUNT_LAMPORTS / 1e9,
            received: totalAmount / 1e9,
          },
          { status: 400 }
        );
      }
    }

    // Проверка 5: Payer соответствует отправителю транзакции
    const transactionSignatures = transaction.transaction.signatures;
    if (transactionSignatures.length === 0) {
      return NextResponse.json(
        { error: "Transaction has no signatures" },
        { status: 400 }
      );
    }

    // Все проверки пройдены - обновляем intent на "paid"
    const amountInSOL = totalAmount / 1e9;
    
    const { error: updateIntentError } = await supabase
      .from("subscription_intents")
      .update({
        status: "paid",
        tx_signature: signature,
        provider: "solana",
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

    // Используем переменную окружения для URL или берем origin из заголовков
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    const origin = baseUrl || request.headers.get("origin") || "http://localhost:3000";
    const activateUrl = `${origin}/activate?code=${intent.intent_id}`;

    return NextResponse.json({
      success: true,
      message: "Payment verified. Redirecting to activation...",
      intent_id: intent.intent_id,
      redirect_url: activateUrl,
      payment: {
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

