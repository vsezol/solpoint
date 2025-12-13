"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types";

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout } =
    useAuthStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    // Инициализация только один раз для этого компонента
    if (initializedRef.current) return;
    initializedRef.current = true;

    const supabase = createClient();

    // Инициализация: проверяем сессию при загрузке
    const initAuth = async () => {
      setLoading(true);
      try {
        // Используем API route для проверки сессии - это более надежно
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут

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

        const data = await response.json();
        const { user: authUser, profile } = data;

        if (profile) {
          setUser(profile as User);
        } else if (authUser) {
          // Пользователь авторизован, но профиль не найден
          setUser(null);
        } else {
          setUser(null);
        }
      } catch (error) {
        // Обработка различных типов ошибок
        if (error instanceof Error) {
          if (error.name === "AbortError") {
            // Таймаут запроса
            setUser(null);
          } else if (error.message.includes("Failed to fetch")) {
            // Сетевая ошибка
            setUser(null);
          } else {
            // Другие ошибки
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Подписываемся на изменения аутентификации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        try {
          // Используем API route для получения профиля
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

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

          if (profile) {
            setUser(profile as User);
          }
        } catch (error) {
          // Тихая обработка ошибок - не логируем, просто не обновляем профиль
          // Пользователь может быть авторизован, но профиль не загружен
          if (error instanceof Error && error.name !== "AbortError") {
            // Только для не-таймаут ошибок можно попробовать еще раз
            // Но пока просто игнорируем
          }
        }
      } else if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        if (event === "SIGNED_OUT") {
          setUser(null);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // При обновлении токена обновляем профиль через API route
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch("/api/auth/me", {
              signal: controller.signal,
              headers: {
                "Content-Type": "application/json",
              },
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const { profile } = await response.json();
              if (profile) {
                setUser(profile as User);
              }
            }
          } catch (error) {
            // Тихая обработка - не критично, если не удалось обновить
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      initializedRef.current = false;
    };
  }, [setUser, setLoading]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      logout();
    } catch (error) {
      // Даже если signOut не удался, очищаем локальное состояние
      logout();
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    logout: handleLogout,
  };
}

