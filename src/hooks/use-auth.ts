"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";

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

  // Используем React Query для загрузки профиля
  const {
    data: user,
    isLoading,
  } = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: fetchProfile,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 минут кэш
    gcTime: 10 * 60 * 1000, // 10 минут в памяти
  });

  // Подписываемся на изменения аутентификации
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Инвалидируем кэш при входе - React Query автоматически перезагрузит данные
        queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
      } else if (event === "SIGNED_OUT") {
        // Очищаем кэш при выходе
        queryClient.setQueryData(["auth", "profile"], null);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Обновляем профиль при обновлении токена
        queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const handleLogout = async () => {
    try {
      // Вызываем API route для logout
      await fetch("/api/auth/logout", { method: "POST" });
      // Очищаем кэш при выходе
      queryClient.setQueryData(["auth", "profile"], null);
      // Редиректим на главную
      window.location.href = "/";
    } catch (error) {
      // Даже если signOut не удался, очищаем кэш и редиректим
      queryClient.setQueryData(["auth", "profile"], null);
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
