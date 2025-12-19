"use client";

import { Button } from "@/components/ui";
import { Settings, Shield } from "lucide-react";
import Link from "next/link";
import { EditProfileButton } from "./edit-profile-button";
import { useAuth } from "@/hooks/use-auth";

export function ProfileActions() {
  const { user } = useAuth();

  // Отладка: проверяем данные пользователя
  if (user) {
    console.log("ProfileActions - user data:", {
      id: user.id,
      twitter_handle: user.twitter_handle,
      is_admin: user.is_admin,
      has_is_admin: 'is_admin' in user,
      type_of_is_admin: typeof user.is_admin,
      is_admin_strict_true: user.is_admin === true,
      is_admin_truthy: !!user.is_admin,
    });
  }

  // Явная проверка для отладки
  const isAdmin = user && ('is_admin' in user) && user.is_admin === true;
  console.log("ProfileActions - isAdmin check result:", isAdmin);

  return (
    <div className="flex gap-2">
      <EditProfileButton />
      {isAdmin && (
        <Button variant="ghost" size="sm" asChild title="Админ-панель">
          <Link href="/admin">
            <Shield className="w-4 h-4" />
          </Link>
        </Button>
      )}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/settings">
          <Settings className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

