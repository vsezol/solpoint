"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Инициализируем auth при загрузке приложения
  useAuth();

  return <>{children}</>;
}

