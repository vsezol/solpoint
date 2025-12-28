"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types";
import { trackEvent, setUserId } from "@/lib/analytics";

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

    const { profile } = await response.json();
    return profile as User | null;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout");
    }
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
    staleTime: 0,
    gcTime: 0,
  });

  // Принудительно обновляем данные после callback
  useEffect(() => {
    if (isFromCallback) {
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
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        
        if (response.ok) {
          const { session } = await response.json();
          if (session?.user) {
            setUserId(session.user.id);
            queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
          } else {
            setUserId(null);
            queryClient.setQueryData(["auth", "profile"], null);
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };

    // Проверяем сразу при загрузке
    checkSession();

    // Проверяем при возврате фокуса на окно (например, после OAuth редиректа)
    const handleFocus = () => {
      checkSession();
    };

    window.addEventListener("focus", handleFocus);

    // Опционально: проверяем периодически (каждые 60 секунд) для обновления токена
    const intervalId = setInterval(() => {
      checkSession();
    }, 60000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(intervalId);
    };
  }, [queryClient]);

  // Обновляем userId когда загружается профиль
  useEffect(() => {
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
