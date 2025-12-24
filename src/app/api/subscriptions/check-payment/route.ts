import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RECIPIENT_ADDRESS = process.env.SOLANA_RECIPIENT_ADDRESS || '6zq2BDgQB3AzZ8sAHUNmrpe86HJHiSkqsbTqru8LhNmo';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://solana-rpc.publicnode.com";

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

    // Если уже paid или claimed, возвращаем текущий статус
    if (intent.status === "paid" || intent.status === "claimed") {
      return NextResponse.json({
        status: intent.status,
        updated: false,
      });
    }

    // Если нет tx_signature, не можем проверить
    if (!intent.tx_signature) {
      return NextResponse.json({
        status: intent.status,
        updated: false,
        message: "No transaction signature to verify",
      });
    }

    // Проверяем транзакцию в блокчейне
    const connection = new Connection(SOLANA_RPC_URL, "finalized");
    
    let transaction;
    try {
      transaction = await connection.getTransaction(intent.tx_signature, {
        commitment: "finalized",
        maxSupportedTransactionVersion: 0,
      });
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return NextResponse.json({
        status: intent.status,
        updated: false,
        message: "Failed to fetch transaction from Solana network. Transaction may not be finalized yet.",
      });
    }

    if (!transaction) {
      return NextResponse.json({
        status: intent.status,
        updated: false,
        message: "Transaction not found or not finalized yet",
      });
    }

    // Проверяем ошибки
    if (transaction.meta?.err !== null) {
      return NextResponse.json({
        status: intent.status,
        updated: false,
        message: "Transaction failed",
        error: transaction.meta?.err,
      });
    }

    // Проверяем балансы (та же логика что в solana-payment)
    const recipientPubkey = new PublicKey(RECIPIENT_ADDRESS);
    let recipientFound = false;
    let totalAmount = 0;

    if (transaction.meta) {
      let accountKeys: Array<{ pubkey: PublicKey }> = [];
      const tx = transaction.transaction;
      
      if ("message" in tx && tx.message && typeof (tx.message as { getAccountKeys?: () => { staticAccountKeys: PublicKey[] } }).getAccountKeys === "function") {
        // VersionedTransaction
        const versionedMessage = tx.message as { getAccountKeys: () => { staticAccountKeys: PublicKey[] } };
        accountKeys = versionedMessage.getAccountKeys().staticAccountKeys.map(
          (pubkey: PublicKey) => ({ pubkey })
        );
      } else if ("message" in tx && tx.message && "accountKeys" in tx.message) {
        // Legacy Transaction
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
            break;
          }
        }
      }
    }

    if (!recipientFound || totalAmount === 0) {
      return NextResponse.json({
        status: intent.status,
        updated: false,
        message: "Transaction recipient does not match or no SOL received",
      });
    }

    // Проверяем сумму соответствует ожидаемой (с допуском ±10%)
    if (intent.expected_amount_lamports) {
      const expectedAmount = intent.expected_amount_lamports;
      const minAmount = Math.floor(expectedAmount * 0.9); // -10% допуск
      const maxAmount = Math.ceil(expectedAmount * 1.1);  // +10% допуск

      if (totalAmount < minAmount || totalAmount > maxAmount) {
        return NextResponse.json({
          status: intent.status,
          updated: false,
          message: `Payment amount does not match. Expected: ${(expectedAmount / 1e9).toFixed(4)} SOL (±10%). Received: ${(totalAmount / 1e9).toFixed(4)} SOL`,
        });
      }
    } else {
      // Fallback: проверяем минимальную сумму если expected_amount не сохранен
      const MIN_AMOUNT_LAMPORTS = 10_000_000; // 0.01 SOL
      if (totalAmount < MIN_AMOUNT_LAMPORTS) {
        return NextResponse.json({
          status: intent.status,
          updated: false,
          message: "Insufficient payment amount",
        });
      }
    }

    // Все проверки пройдены - обновляем статус на "paid"
    const { error: updateError } = await supabase
      .from("subscription_intents")
      .update({
        status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", intent.id);

    if (updateError) {
      console.error("Error updating intent:", updateError);
      return NextResponse.json(
        { error: "Failed to update intent", details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "paid",
      updated: true,
      message: "Payment verified and intent updated",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

