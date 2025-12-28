import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

// НЕ используем persist - токены хранятся в куках через Supabase SSR
// Данные профиля загружаются из БД при каждой инициализации
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },
  setLoading: (loading) => {
    set({ isLoading: loading });
  },
  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
    });
  },
}));

