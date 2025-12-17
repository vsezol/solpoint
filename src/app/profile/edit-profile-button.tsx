"use client";

import { Button } from "@/components/ui";
import { Edit } from "lucide-react";
import { useProfileEdit } from "./profile-edit-provider";
import { trackEvent } from "@/lib/analytics";

export function EditProfileButton() {
  const { isEditing, setIsEditing } = useProfileEdit();

  return (
    <Button
      variant="outline"
      size="sm"
      className="bg-black/30 text-black border-black/20 hover:bg-black/40 hover:border-black/30"
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
      <Edit className="w-4 h-4 mr-2" />
      {isEditing ? "Cancel Edit" : "Edit Profile"}
    </Button>
  );
}

