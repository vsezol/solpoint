"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import type { Project } from "@/types";

interface ProjectViewTrackerProps {
  project: Project;
}

export function ProjectViewTracker({ project }: ProjectViewTrackerProps) {
  useEffect(() => {
    trackEvent("project_view", {
      event_category: "Projects",
      event_label: project.slug || project.id,
      project_id: project.id,
      project_slug: project.slug,
      project_name: project.name,
      members_count: project.members_count,
      country: project.country || "",
    });
  }, [project]);

  return null;
}

