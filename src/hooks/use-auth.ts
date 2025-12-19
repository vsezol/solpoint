"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
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
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { profile } = await response.json();
    
    // Отладка: логируем данные профиля из API
    if (profile) {
      console.log("useAuth - profile from API:", {
        id: profile.id,
        twitter_handle: profile.twitter_handle,
        is_admin: profile.is_admin,
        has_is_admin: 'is_admin' in profile,
        all_keys: Object.keys(profile),
      });
    }
    
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
  
  // Флаг для отслеживания первого вызова onAuthStateChange
  // onAuthStateChange всегда сначала вызывает callback с текущим состоянием сессии
  // Если это первый вызов и сессия уже есть - это восстановление из cookies, не логин
  const isFirstCall = useRef(true);

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
        // Устанавливаем user ID в GA
        setUserId(session.user.id);
        
        // Отправляем событие только если это реальный логин, а не восстановление сессии
        // Если это первый вызов и сессия уже есть - это восстановление, пропускаем событие
        if (!isFirstCall.current) {
          trackEvent("login_success", {
            event_category: "Authentication",
            method: "twitter",
          });
        }
        
        // После первого вызова помечаем, что это уже не первый раз
        isFirstCall.current = false;
      } else if (event === "SIGNED_OUT") {
        // Очищаем кэш при выходе
        queryClient.setQueryData(["auth", "profile"], null);
        // Очищаем user ID в GA
        setUserId(null);
        // Сбрасываем флаг при выходе, чтобы при следующем логине событие отправилось
        isFirstCall.current = false;
        trackEvent("logout", {
          event_category: "Authentication",
        });
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Обновляем профиль при обновлении токена
        queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
        // После первого вызова помечаем, что это уже не первый раз
        isFirstCall.current = false;
      } else {
        // Любое другое событие (включая INITIAL_SESSION) - это первый вызов
        // Помечаем, что первый вызов прошел
        isFirstCall.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const handleLogout = async () => {
    try {
      trackEvent("logout", {
        event_category: "Authentication",
      });
      // Вызываем API route для logout
      await fetch("/api/auth/logout", { method: "POST" });
      // Очищаем кэш при выходе
      queryClient.setQueryData(["auth", "profile"], null);
      // Очищаем user ID в GA
      setUserId(null);
      // Редиректим на главную
      window.location.href = "/";
    } catch (error) {
      // Даже если signOut не удался, очищаем кэш и редиректим
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
