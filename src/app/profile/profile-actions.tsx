"use client";

import { Button } from "@/components/ui";
import { Settings, Edit } from "lucide-react";
import Link from "next/link";
import { useProfileEdit } from "./profile-edit-provider";

export function ProfileActions() {
  const { isEditing, setIsEditing } = useProfileEdit();

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsEditing(!isEditing)}
      >
        <Edit className="w-4 h-4 mr-2" />
        {isEditing ? "Cancel Edit" : "Edit Profile"}
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/settings">
          <Settings className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

