"use client";

import { Button } from "@/components/ui";
import { Settings } from "lucide-react";
import Link from "next/link";
import { EditProfileButton } from "./edit-profile-button";

export function ProfileActions() {
  return (
    <div className="flex gap-2">
      <EditProfileButton />
      <Button variant="ghost" size="sm" asChild>
        <Link href="/settings">
          <Settings className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

