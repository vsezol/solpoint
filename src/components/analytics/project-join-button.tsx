"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { trackEvent } from "@/lib/analytics";
import type { Project } from "@/types";
import { useRouter } from "next/navigation";

interface ProjectJoinButtonProps {
  project: Project;
  isMember: boolean;
  onJoin?: () => void;
}

export function ProjectJoinButton({ project, isMember, onJoin }: ProjectJoinButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    if (isMember || isLoading) return;
    
    setIsLoading(true);
    
    trackEvent("project_join_click", {
      event_category: "Projects",
      event_label: project.slug || project.id,
      project_id: project.id,
      project_slug: project.slug,
      project_name: project.name,
    });
    
    try {
      // TODO: Implement join API call
      if (onJoin) {
        await onJoin();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Error joining project:", error);
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
      {isMember ? "Member" : isLoading ? "Joining..." : "Join Project"}
    </Button>
  );
}

