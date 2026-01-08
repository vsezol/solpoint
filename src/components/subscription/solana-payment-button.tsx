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
  email?: string;
  onStatusChange?: (status: string, message?: string) => void;
  onSuccess?: (intentId: string) => void;
  onError?: (error: string, intentId?: string) => void;
  onEmailValidationError?: (error: string) => void;
}

export function SolanaPaymentButton({ 
  plan, 
  email,
  onStatusChange,
  onSuccess, 
  onError,
  onEmailValidationError
}: SolanaPaymentButtonProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("");

  // Получаем адрес получателя из переменных окружения (на фронте это будет публичная переменная)
  const recipientAddress = process.env.NEXT_PUBLIC_SOLANA_RECIPIENT_ADDRESS || '6zq2BDgQB3AzZ8sAHUNmrpe86HJHiSkqsbTqru8LhNmo';

  const updateStatus = (status: string, message?: string) => {
    setCurrentStatus(status);
    onStatusChange?.(status, message);
  };

  const handlePayment = useCallback(async () => {
    if (!publicKey) {
      onError?.("Wallet not connected. Please connect your wallet.");
      return;
    }

    if (!sendTransaction) {
      onError?.("Transaction function unavailable. Please reconnect your wallet.");
      return;
    }

    if (!email) {
      onError?.("Email is required. Please enter your email first.");
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
    updateStatus("calculating", "Calculating SOL amount...");

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
        throw new Error("Failed to calculate SOL amount. Please try again.");
      }

      const solAmountData = await solAmountResponse.json();
      const amountInLamports = solAmountData.amount_lamports;

      updateStatus("preparing", "Preparing transaction...");

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
      updateStatus("connecting", "Connecting to Solana network...");
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
            "Failed to connect to Solana network. The RPC may be overloaded. Please try again later."
          );
        }
      }
      
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Отправляем транзакцию
      updateStatus("sending", "Sending transaction to your wallet...");
      
      
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
      });


      // Создаем intent ПОСЛЕ отправки транзакции (когда есть signature)
      updateStatus("creating_intent", "Creating payment record...");
      
      const intentResponse = await fetch("/api/subscriptions/create-intent-with-signature", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: plan.id,
          email: email.trim(),
          tx_signature: signature,
        }),
      });


      if (!intentResponse.ok) {
        const errorData = await intentResponse.json().catch(() => ({}));
        
        
        // КРИТИЧНО: Транзакция уже отправлена, но intent не создан
        // Сохраняем информацию о транзакции для восстановления
        if (typeof window !== "undefined") {
          localStorage.setItem("failed_payment_recovery", JSON.stringify({
            signature,
            plan_id: plan.id,
            email: email.trim(),
            amount_lamports: amountInLamports,
            timestamp: Date.now(),
            error: errorData.error || "Failed to create payment record"
          }));
        }
        
        // Пробуем восстановить intent через альтернативный endpoint
        try {
          const recoveryResponse = await fetch("/api/subscriptions/recover-intent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              plan_id: plan.id,
              email: email.trim(),
              tx_signature: signature,
            }),
          });
          
          if (recoveryResponse.ok) {
            const recoveryData = await recoveryResponse.json();
            // Продолжаем с восстановленным intent
            const intentId = recoveryData.intent_id;
            if (typeof window !== "undefined") {
              localStorage.setItem("subscription_intent_id", intentId);
              localStorage.setItem("subscription_intent_status", "pending");
            }
            // Продолжаем процесс верификации
            updateStatus("verifying", "Verifying payment...");
            const response = await fetch("/api/subscriptions/solana-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                signature,
                payer: publicKey.toString(),
                intent_id: intentId,
              }),
            });
            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                updateStatus("success", "Payment verified successfully!");
                if (typeof window !== "undefined") {
                  localStorage.setItem("subscription_intent_status", "paid");
                }
                if (data.redirect_url) {
                  setTimeout(() => {
                    window.location.href = data.redirect_url;
                  }, 1000);
                } else {
                  onSuccess?.(data.intent_id || intentId);
                }
                return;
              }
            }
          }
        } catch (recoveryError) {
        }
        
        throw new Error(
          errorData.error || 
          `Failed to create payment record. Your transaction signature: ${signature}. Please contact support with this signature to recover your payment.`
        );
      }

      const intentData = await intentResponse.json();
      const intentId = intentData.intent_id;
      

      // Сохраняем intent_id и статус в localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("subscription_intent_id", intentId);
        localStorage.setItem("subscription_intent_status", "pending");
      }

      updateStatus("confirming", "Waiting for transaction confirmation...");


      // Ждем подтверждения транзакции с увеличенным таймаутом и retry логикой
      // Используем getTransaction вместо confirmTransaction для более надежной проверки
      let confirmed = false;
      const maxWaitTime = 60000; // 60 секунд (уменьшено с 180)
      const checkInterval = 2000; // Проверяем каждые 2 секунды (уменьшено с 3)
      const startTime = Date.now();
      let iterationCount = 0;

      while (!confirmed && (Date.now() - startTime) < maxWaitTime) {
        iterationCount++;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        

        try {
          // Сразу проверяем транзакцию через getTransaction (более надежно)
          // confirmTransaction может зависнуть, поэтому используем прямой запрос
          const tx = await Promise.race([
            connection.getTransaction(signature, {
              commitment: "confirmed", // Используем confirmed вместо finalized для более быстрой проверки
              maxSupportedTransactionVersion: 0,
            }),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error("timeout")), 5000)
            )
          ]);
          
          
          if (tx && tx.meta && tx.meta.err === null) {
                // Транзакция подтверждена
                confirmed = true;
                break;
          } else if (tx && tx.meta && tx.meta.err !== null) {
            // Транзакция выполнена, но с ошибкой
            throw new Error(`Transaction failed: ${JSON.stringify(tx.meta.err)}`);
          }
          // Если tx === null, транзакция еще не подтверждена, продолжаем ждать

          // Ждем перед следующей проверкой
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          
          // Обновляем статус каждые 5 секунд
          if (elapsed % 5 === 0 && elapsed > 0) {
            updateStatus("confirming", `Waiting for confirmation... (${elapsed}s)`);
          }
        } catch (error: any) {
          
          // Если это не таймаут, выбрасываем ошибку
          if (!error?.message?.includes("timeout") && !error?.message?.includes("not confirmed")) {
            throw error;
          }
          
          // При таймауте продолжаем цикл
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
      }

      // Если не подтвердилось за отведенное время, проверяем последний раз
      if (!confirmed) {
        
        try {
          const tx = await Promise.race([
            connection.getTransaction(signature, {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            }),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error("timeout")), 5000)
            )
          ]);
          
          if (tx && tx.meta?.err === null) {
            confirmed = true;
          } else {
          }
        } catch (checkError) {
          // Игнорируем ошибку проверки - продолжаем верификацию на backend
        }
      }

      if (!confirmed) {
        // Не выбрасываем ошибку, а продолжаем - транзакция может подтвердиться позже
        // Backend проверит транзакцию при верификации
        updateStatus("verifying", "Transaction sent. Verifying payment (this may take a moment)...");
      }

      updateStatus("verifying", "Verifying payment...");

      // Отправляем signature на backend для проверки с intent_id
      const response = await fetch("/api/subscriptions/solana-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signature,
          payer: publicKey.toString(),
          intent_id: intentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        
        // Если intent создан и можно активировать, передаем intent_id в onError
        if (errorData.can_activate && errorData.intent_id) {
          updateStatus("pending_activation", errorData.message || "Your payment intent has been created. You can activate your subscription now.");
          // Передаем intent_id в onError, чтобы родительский компонент мог показать кнопку активации
          onError?.(errorData.message || errorData.error || "Payment intent created. You can activate your subscription.", errorData.intent_id);
          return;
        }
        
        throw new Error(errorData.error || "Failed to verify payment. Please contact support with your transaction signature.");
      }

      const data = await response.json();
      
      if (data.success) {
        updateStatus("success", "Payment verified successfully!");
        
        // Обновляем localStorage на paid
        if (typeof window !== "undefined") {
          localStorage.setItem("subscription_intent_status", "paid");
        }
        
        // Редиректим на страницу активации
        if (data.redirect_url) {
          setTimeout(() => {
            window.location.href = data.redirect_url;
          }, 1000);
        } else {
          onSuccess?.(data.intent_id || intentId);
        }
      } else {
        throw new Error(data.error || "Payment verification failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      updateStatus("error", errorMessage);
      
      // Проверяем, есть ли сохраненный intent_id в localStorage
      let savedIntentId: string | null = null;
      if (typeof window !== "undefined") {
        savedIntentId = localStorage.getItem("subscription_intent_id");
      }
      
      onError?.(errorMessage, savedIntentId || undefined);
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, sendTransaction, connection, plan, recipientAddress, email, onStatusChange, onSuccess, onError]);

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
    // Если email не введен, показываем кастомную кнопку с валидацией
    if (!email || !email.trim()) {
      return (
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => {
              onEmailValidationError?.("Please insert email.");
            }}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Select Wallet
          </Button>
          <p className="text-sm text-muted-foreground">
            Connect wallet to pay with Solana
          </p>
        </div>
      );
    }

    // Если email введен, показываем настоящий WalletMultiButton
    return (
      <div className="flex flex-col items-center gap-2">
        <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90" />
        <p className="text-sm text-muted-foreground">
          Connect wallet to pay with Solana
        </p>
      </div>
    );
  }

  const getStatusMessage = () => {
    switch (currentStatus) {
      case "calculating":
        return "Calculating SOL amount...";
      case "preparing":
        return "Preparing transaction...";
      case "connecting":
        return "Connecting to Solana network...";
      case "sending":
        return "Sending transaction to your wallet...";
      case "creating_intent":
        return "Creating payment record...";
      case "confirming":
        return "Waiting for transaction confirmation...";
      case "verifying":
        return "Verifying payment...";
      case "success":
        return "Payment verified! Redirecting...";
      case "error":
        return "";
      default:
        return "";
    }
  };

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
        disabled={isProcessing || !publicKey || !email}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {getStatusMessage() || "Processing..."}
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Pay with Solana
          </>
        )}
      </Button>
      
      {isProcessing && currentStatus !== "error" && (
        <p className="text-xs text-muted-foreground text-center">
          {currentStatus === "sending" || currentStatus === "confirming"
            ? "Please confirm the transaction in your wallet"
            : "Please wait..."}
        </p>
      )}
    </div>
  );
}

