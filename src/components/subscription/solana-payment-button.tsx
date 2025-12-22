"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Button } from "@/components/ui";
import { Loader2, Wallet } from "lucide-react";
import type { Plan } from "@/types";

// Component to display SOL amount (fetched from backend)
function SolanaAmountDisplay({ plan }: { plan: Plan }) {
  const [solAmount, setSolAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscriptions/calculate-sol-amount", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan_id: plan.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.amount_sol) {
          setSolAmount(data.amount_sol);
        }
      })
      .catch((err) => {
        console.error("Error fetching SOL amount:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [plan.id]);

  if (loading) {
    return (
      <>
        <p className="text-sm font-medium">Calculating amount...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Plan: ${plan.price} {plan.currency.toUpperCase()}
        </p>
      </>
    );
  }

  return (
    <>
      <p className="text-sm font-medium">
        Amount: ~{solAmount?.toFixed(4) || "0.0000"} SOL
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Plan: ${plan.price} {plan.currency.toUpperCase()} (includes 5% buffer)
      </p>
    </>
  );
}

interface SolanaPaymentButtonProps {
  plan: Plan;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function SolanaPaymentButton({ plan, onSuccess, onError }: SolanaPaymentButtonProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Получаем адрес получателя из переменных окружения (на фронте это будет публичная переменная)
  const recipientAddress = process.env.NEXT_PUBLIC_SOLANA_RECIPIENT_ADDRESS || '6zq2BDgQB3AzZ8sAHUNmrpe86HJHiSkqsbTqru8LhNmo';

  const handlePayment = useCallback(async () => {
    if (!publicKey) {
      onError?.("Wallet not connected. Please connect your wallet.");
      return;
    }

    if (!sendTransaction) {
      onError?.("Transaction function unavailable. Please reconnect your wallet.");
      return;
    }

    if (!recipientAddress) {
      console.error("NEXT_PUBLIC_SOLANA_RECIPIENT_ADDRESS is not set");
      onError?.(
        "Recipient address not configured. Please check NEXT_PUBLIC_SOLANA_RECIPIENT_ADDRESS environment variable and restart the server."
      );
      return;
    }

    setIsProcessing(true);
    setIsSending(true);

    try {
      // Get exact SOL amount from backend (with current SOL price)
      const solAmountResponse = await fetch("/api/subscriptions/calculate-sol-amount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: plan.id,
        }),
      });

      if (!solAmountResponse.ok) {
        throw new Error("Failed to calculate SOL amount");
      }

      const solAmountData = await solAmountResponse.json();
      const amountInLamports = solAmountData.amount_lamports;

      // Создаем транзакцию перевода SOL
      const recipientPubkey = new PublicKey(recipientAddress);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: amountInLamports,
        })
      );

      // Получаем последний блок для recentBlockhash с обработкой ошибок RPC
      let blockhash: string;
      try {
        const blockhashResult = await connection.getLatestBlockhash("finalized");
        blockhash = blockhashResult.blockhash;
      } catch (rpcError) {
        console.error("RPC error getting blockhash:", rpcError);
        // Пробуем с другим commitment level
        try {
          const blockhashResult = await connection.getLatestBlockhash("confirmed");
          blockhash = blockhashResult.blockhash;
        } catch {
          throw new Error(
            "Failed to connect to Solana RPC. The public RPC may be overloaded. Please try again later or use QuickNode/Helius RPC."
          );
        }
      }
      
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Отправляем транзакцию
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
      });

      setIsSending(false);

      // Ждем подтверждения транзакции
      await connection.confirmTransaction(signature, "finalized");

      // Отправляем signature на backend для проверки
      const response = await fetch("/api/subscriptions/solana-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signature,
          payer: publicKey.toString(),
          plan_id: plan.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to verify payment");
      }

      const data = await response.json();
      
      if (data.success) {
        onSuccess?.();
      } else {
        throw new Error(data.error || "Payment verification failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
      setIsSending(false);
    }
  }, [publicKey, sendTransaction, connection, plan, recipientAddress, onSuccess, onError]);

  // Show error if recipient address is not configured
  if (!recipientAddress) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 border border-red-500/50 rounded-lg bg-red-500/10">
        <p className="text-sm text-red-500 font-medium mb-1">
          Configuration Error
        </p>
        <p className="text-xs text-red-400 text-center">
          Recipient address not configured. Please check NEXT_PUBLIC_SOLANA_RECIPIENT_ADDRESS in .env.local and restart the dev server.
        </p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center gap-2">
        <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90" />
        <p className="text-sm text-muted-foreground">
          Connect wallet to pay with Solana
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">
          Connected: {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
        </p>
        <SolanaAmountDisplay plan={plan} />
      </div>
      
      <Button
        onClick={handlePayment}
        disabled={isProcessing || !publicKey}
        className="w-full"
        size="lg"
      >
        {isSending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending transaction...
          </>
        ) : isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Waiting for confirmation...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Pay with Solana
          </>
        )}
      </Button>
      
      {isProcessing && (
        <p className="text-xs text-muted-foreground text-center">
          Please confirm the transaction in your wallet
        </p>
      )}
    </div>
  );
}

