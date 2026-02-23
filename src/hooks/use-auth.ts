"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types";
import { trackEvent, setUserId } from "@/lib/analytics";

// Глобальный флаг для отслеживания инициализации checkSession
// Это предотвращает множественные вызовы при нескольких экземплярах useAuth
let sessionCheckSetupDone = false;
let globalFocusHandler: (() => void) | null = null;
let globalIntervalId: NodeJS.Timeout | null = null;

const CLIENT_AUTH_DEBUG_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_AUTH_DEBUG_LOGS === "true";

function clientAuthDebugLog(event: string, payload?: Record<string, unknown>) {
  if (!CLIENT_AUTH_DEBUG_ENABLED) {
    return;
  }

  if (payload) {
    console.info(`[auth-debug:client] ${event}`, payload);
    return;
  }

  console.info(`[auth-debug:client] ${event}`);
}

// Функция для загрузки профиля через API
async function fetchProfile(): Promise<User | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("/api/auth/me", {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { user, profile } = await response.json();
    clientAuthDebugLog("fetch_profile_response", {
      has_user: Boolean(user),
      has_profile: Boolean(profile),
      user_id: user?.id ?? null,
      profile_id: profile?.id ?? null,
      profile_twitter_handle: profile?.twitter_handle ?? null,
    });
    return profile as User | null;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout");
    }
    clientAuthDebugLog("fetch_profile_error", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    throw error;
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [isFromCallback, setIsFromCallback] = useState(false);

  // Проверяем URL на наличие параметра auth=success (только на клиенте)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("auth") === "success") {
        setIsFromCallback(true);
      }
    }
  }, []);

  // Используем React Query для загрузки профиля
  const {
    data: user,
    isLoading,
  } = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: fetchProfile,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
    gcTime: 10 * 60 * 1000, // 10 минут - кешируем в памяти
  });

  // Принудительно обновляем данные после callback
  useEffect(() => {
    if (isFromCallback) {
      clientAuthDebugLog("oauth_success_query_param_detected");
      queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("auth");
        window.history.replaceState({}, "", url.toString());
        setIsFromCallback(false);
        
        // Отслеживаем успешный логин
        trackEvent("login_success", {
          event_category: "Authentication",
          method: "twitter",
        });
      }
    }
  }, [isFromCallback, queryClient]);

  // Проверяем сессию при инициализации и периодически
  // Используем глобальный флаг, чтобы checkSession инициализировался только один раз
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        
        if (response.ok) {
          const { session } = await response.json();
          clientAuthDebugLog("session_check_response", {
            has_session_user: Boolean(session?.user),
            session_user_id: session?.user?.id ?? null,
          });
          if (session?.user) {
            setUserId(session.user.id);
            // Обновляем данные только если профиль не загружен или устарел
            const queryData = queryClient.getQueryData(["auth", "profile"]);
            clientAuthDebugLog("session_check_query_state", {
              has_profile_query_data: Boolean(queryData),
            });
            if (!queryData) {
              queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
            }
          } else {
            setUserId(null);
            queryClient.setQueryData(["auth", "profile"], null);
          }
        } else {
          clientAuthDebugLog("session_check_http_error", {
            status: response.status,
          });
        }
      } catch (error) {
        console.error("Error checking session:", error);
        clientAuthDebugLog("session_check_error", {
          message: error instanceof Error ? error.message : "unknown_error",
        });
      }
    };

    // Инициализируем проверку сессии только один раз глобально
    if (!sessionCheckSetupDone) {
      sessionCheckSetupDone = true;
      
      // Проверяем сразу при первой загрузке
      checkSession();

      // Проверяем при возврате фокуса на окно (например, после OAuth редиректа)
      globalFocusHandler = () => {
        checkSession();
      };

      window.addEventListener("focus", globalFocusHandler);

      // Опционально: проверяем периодически (каждые 60 секунд) для обновления токена
      globalIntervalId = setInterval(() => {
        checkSession();
      }, 60000);
    }

    // Cleanup не нужен, так как мы используем глобальные обработчики
    // которые остаются на все время жизни приложения
    return () => {
      // Оставляем обработчики активными для всех компонентов
    };
  }, [queryClient]);

  // Обновляем userId когда загружается профиль
  useEffect(() => {
    clientAuthDebugLog("auth_state_updated", {
      has_profile_user: Boolean(user),
      profile_user_id: user?.id ?? null,
    });
    if (user) {
      setUserId(user.id);
    } else {
      setUserId(null);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      trackEvent("logout", {
        event_category: "Authentication",
      });
      await fetch("/api/auth/logout", { method: "POST" });
      queryClient.setQueryData(["auth", "profile"], null);
      setUserId(null);
      window.location.href = "/";
    } catch (error) {
      queryClient.setQueryData(["auth", "profile"], null);
      setUserId(null);
      window.location.href = "/";
    }
  };

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading,
    logout: handleLogout,
  };
}
