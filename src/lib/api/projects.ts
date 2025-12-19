import type { Project } from "@/types";

export interface ProjectFilters {
  search?: string;
  country?: string;
  country_code?: string;
  city?: string;
  limit?: number;
  offset?: number;
}

export interface GetProjectsResponse {
  projects: Project[];
  error?: string;
}

/**
 * Получить список проектов с фильтрацией
 */
export async function getProjects(
  filters: ProjectFilters = {}
): Promise<Project[]> {
  try {
    const params = new URLSearchParams();

    if (filters.search) {
      params.append("search", filters.search);
    }

    if (filters.country) {
      params.append("country", filters.country);
    }

    if (filters.country_code) {
      params.append("country_code", filters.country_code);
    }

    if (filters.city) {
      params.append("city", filters.city);
    }

    if (filters.limit) {
      params.append("limit", String(filters.limit));
    }

    if (filters.offset) {
      params.append("offset", String(filters.offset));
    }

    const response = await fetch(`/api/projects?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching projects:", errorData);
      return [];
    }

    const data: GetProjectsResponse = await response.json();
    return data.projects || [];
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

/**
 * Получить проект по ID
 */
export async function getProjectById(
  projectId: string
): Promise<Project | null> {
  try {
    const response = await fetch(`/api/projects/${projectId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching project:", errorData);
      return null;
    }

    const data = await response.json();
    return data.project || null;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

/**
 * Получить проект по slug
 */
export async function getProjectBySlug(slug: string): Promise<Project | null> {
  try {
    const response = await fetch(`/api/projects/slug/${slug}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching project by slug:", errorData);
      return null;
    }

    const data = await response.json();
    return data.project || null;
  } catch (error) {
    console.error("Error fetching project by slug:", error);
    return null;
  }
}

/**
 * Создать новый проект
 */
export async function createProject(
  projectData: Partial<Project>
): Promise<Project | null> {
  try {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error creating project:", errorData);
      throw new Error(errorData.error || "Failed to create project");
    }

    const data = await response.json();
    return data.project || null;
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
}

