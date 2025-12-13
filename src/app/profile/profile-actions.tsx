"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Settings, Edit } from "lucide-react";
import Link from "next/link";

export function ProfileActions() {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsEditing(!isEditing)}
      >
        <Edit className="w-4 h-4 mr-2" />
        Edit Profile
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/settings">
          <Settings className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

