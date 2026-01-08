"use client";

import { Button } from "@/components/ui";
import { Edit } from "lucide-react";
import { useProfileEdit } from "./profile-edit-provider";
import { trackEvent } from "@/lib/analytics";
import { useEffect } from "react";

export function EditProfileButton() {
  const { isEditing, setIsEditing } = useProfileEdit();

  // Находим форму редактирования и скроллим к ней при включении режима редактирования
  useEffect(() => {
    if (isEditing) {
      // Небольшая задержка, чтобы форма успела отрендериться
      setTimeout(() => {
        const formElement = document.querySelector('form[class*="space-y-6"]');
        if (formElement) {
          formElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [isEditing]);

  return (
    <Button
      variant="outline"
      size="sm"
      className="group bg-black/70 text-white border-white/30 backdrop-blur-md shadow-2xl hover:bg-black/90 hover:border-white/50 hover:scale-105 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] active:scale-100 transition-all duration-200 font-medium cursor-pointer"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
      }}
      onClick={() => {
        const newEditingState = !isEditing;
        if (newEditingState) {
          trackEvent("profile_edit_start", {
            event_category: "Profiles",
          });
        }
        setIsEditing(newEditingState);
      }}
    >
      <Edit className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
      {isEditing ? "Cancel Edit" : "Edit Profile"}
    </Button>
  );
}



