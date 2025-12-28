"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { trackEvent } from "@/lib/analytics";
import type { Workspace } from "@/types";
import { useRouter } from "next/navigation";

interface WorkspaceJoinButtonProps {
  workspace: Workspace;
  isMember: boolean;
  onJoin?: () => void;
}

export function WorkspaceJoinButton({ workspace, isMember, onJoin }: WorkspaceJoinButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    if (isMember || isLoading) return;
    
    setIsLoading(true);
    
    trackEvent("workspace_join_click", {
      event_category: "Workspaces",
      event_label: workspace.slug || workspace.id,
      workspace_id: workspace.id,
      workspace_slug: workspace.slug,
      workspace_name: workspace.name,
    });
    
    try {
      // TODO: Implement join API call
      if (onJoin) {
        await onJoin();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Error joining workspace:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant={isMember ? "outline" : "primary"} 
      className="w-full" 
      size="lg"
      onClick={handleJoin}
      disabled={isMember || isLoading}
    >
      {isMember ? "Member" : isLoading ? "Joining..." : "Join Workspace"}
    </Button>
  );
}

