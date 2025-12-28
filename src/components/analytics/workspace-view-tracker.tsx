"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import type { Workspace } from "@/types";

interface WorkspaceViewTrackerProps {
  workspace: Workspace;
}

export function WorkspaceViewTracker({ workspace }: WorkspaceViewTrackerProps) {
  useEffect(() => {
    trackEvent("workspace_view", {
      event_category: "Workspaces",
      event_label: workspace.slug || workspace.id,
      workspace_id: workspace.id,
      workspace_slug: workspace.slug,
      workspace_name: workspace.name,
      members_count: workspace.members_count,
      country: workspace.country,
    });
  }, [workspace]);

  return null;
}

