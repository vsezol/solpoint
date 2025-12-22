"use client";

import { useEffect, useRef, useState } from "react";
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
  const isFirstCall = useRef(true);
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
      }
    }
  }, [isFromCallback, queryClient]);

  // Подписываемся на изменения аутентификации
  useEffect(() => {
    const supabase = createClient();

    // Проверяем текущую сессию при инициализации
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
        setUserId(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
        setUserId(session.user.id);
        
        if (!isFirstCall.current) {
          trackEvent("login_success", {
            event_category: "Authentication",
            method: "twitter",
          });
        }
        
        isFirstCall.current = false;
      } else if (event === "SIGNED_OUT") {
        queryClient.setQueryData(["auth", "profile"], null);
        setUserId(null);
        isFirstCall.current = false;
        trackEvent("logout", {
          event_category: "Authentication",
        });
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
        isFirstCall.current = false;
      } else if (event === "INITIAL_SESSION" && session?.user) {
        queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
        setUserId(session.user.id);
        isFirstCall.current = false;
      } else {
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
