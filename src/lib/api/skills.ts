import type { SkillCategoryDefinition, SkillDefinition } from "@/lib/profile-taxonomy";

interface SkillsResponse {
  items?: SkillDefinition[];
  categories?: SkillCategoryDefinition[];
  error?: string;
}

export async function getSkills(): Promise<{ items: SkillDefinition[]; categories: SkillCategoryDefinition[] }> {
  const response = await fetch("/api/skills", {
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as SkillsResponse;

  if (!response.ok) {
    throw new Error(data.error || "Failed to load skills");
  }

  return {
    items: Array.isArray(data.items) ? data.items : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
  };
}
