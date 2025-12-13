"use client";

import { useAuth } from "@/hooks/use-auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Инициализируем auth при загрузке приложения
  // React Query автоматически загрузит профиль при первом вызове useAuth
  useAuth();

  return <>{children}</>;
}

