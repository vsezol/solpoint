"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function IntentChecker() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Проверяем только на клиенте и только если не на странице активации
    if (typeof window === "undefined" || pathname === "/activate") {
      return;
    }

    const checkIntent = async () => {
      const intentId = localStorage.getItem("subscription_intent_id");
      const intentStatus = localStorage.getItem("subscription_intent_status");

      // Если нет intent_id, ничего не делаем
      if (!intentId) {
        return;
      }

      // Если статус уже success, не проверяем
      if (intentStatus === "success") {
        return;
      }

      // Если статус pending, проверяем на бэкенде и редиректим
      if (intentStatus === "pending" || !intentStatus) {
        try {
          // Проверяем статус intent на бэкенде
          const response = await fetch(`/api/subscriptions/intent?code=${intentId}`);
          if (response.ok) {
            const data = await response.json();
            const intent = data.intent;

            // Если intent в статусе pending и есть tx_signature, проверяем транзакцию
            if (intent.status === "pending" && intent.tx_signature) {
              const checkResponse = await fetch("/api/subscriptions/check-payment", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  intent_id: intentId,
                }),
              });

              if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                if (checkData.updated && checkData.status === "paid") {
                  // Обновляем localStorage
                  localStorage.setItem("subscription_intent_status", "paid");
                  // Редиректим на активацию
                  router.push(`/activate?code=${intentId}`);
                  return;
                }
              }
            }

            // Если intent уже paid, редиректим на активацию
            if (intent.status === "paid") {
              localStorage.setItem("subscription_intent_status", "paid");
              router.push(`/activate?code=${intentId}`);
              return;
            }

            // Если intent claimed, обновляем localStorage на success
            if (intent.status === "claimed") {
              localStorage.setItem("subscription_intent_status", "success");
              // Можно удалить intent_id из localStorage, так как подписка активирована
              localStorage.removeItem("subscription_intent_id");
            }
          }
        } catch (error) {
          console.error("Error checking intent:", error);
          // Не блокируем пользователя при ошибке
        }
      }
    };

    checkIntent();
  }, [router, pathname]);

  return null;
}

