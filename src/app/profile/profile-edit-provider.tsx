"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// Context для управления состоянием редактирования
const ProfileEditContext = createContext<{
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
} | null>(null);

export function useProfileEdit() {
  const context = useContext(ProfileEditContext);
  if (!context) {
    throw new Error("useProfileEdit must be used within ProfileEditProvider");
  }
  return context;
}

interface ProfileEditProviderProps {
  children: ReactNode;
}

export function ProfileEditProvider({ children }: ProfileEditProviderProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <ProfileEditContext.Provider value={{ isEditing, setIsEditing }}>
      {children}
    </ProfileEditContext.Provider>
  );
}

