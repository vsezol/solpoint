import {
  MAX_PROFILE_SKILLS,
  getSkillDefinitionBySlug,
  resolveSkillSlug,
} from "@/lib/profile-taxonomy";
import type { ProfileSkillItem } from "@/types";

export interface PersistedProfileSkillRow {
  name: string;
  sort_order: number;
}

export interface LegacyIncomingSkill {
  name?: string;
}

interface SupabaseWriteResult {
  error: { message?: string | null } | null;
}

interface SupabaseLike {
  from: (table: string) => {
    delete: () => { eq: (column: string, value: string) => PromiseLike<SupabaseWriteResult> };
    insert: (rows: Array<Record<string, unknown>>) => PromiseLike<SupabaseWriteResult>;
  };
}

export function normalizeIncomingSkillSlugs(rawSkillSlugs: string[]): {
  skillSlugs: string[];
  invalidValues: string[];
} {
  const deduped = new Set<string>();
  const skillSlugs: string[] = [];
  const invalidValues: string[] = [];

  for (const raw of rawSkillSlugs) {
    if (typeof raw !== "string") {
      invalidValues.push(String(raw));
      continue;
    }
    const slug = resolveSkillSlug(raw);
    if (!slug) {
      invalidValues.push(raw);
      continue;
    }
    if (deduped.has(slug)) {
      continue;
    }
    deduped.add(slug);
    skillSlugs.push(slug);
  }

  return { skillSlugs, invalidValues };
}

export function normalizeLegacySkillNames(rawSkills: LegacyIncomingSkill[]): string[] {
  const deduped = new Set<string>();
  const skillSlugs: string[] = [];

  for (const item of rawSkills) {
    if (!item || typeof item !== "object" || typeof item.name !== "string") {
      continue;
    }
    const slug = resolveSkillSlug(item.name);
    if (!slug || deduped.has(slug)) {
      continue;
    }
    deduped.add(slug);
    skillSlugs.push(slug);
  }

  return skillSlugs;
}

export function ensureSkillLimit(skillSlugs: string[]) {
  if (skillSlugs.length > MAX_PROFILE_SKILLS) {
    throw new Error(`At most ${MAX_PROFILE_SKILLS} skills allowed`);
  }
}

export function mapProfileSkillRowsToResponse(rows: PersistedProfileSkillRow[]): ProfileSkillItem[] {
  return rows
    .map((row) => {
      const slug = resolveSkillSlug(row.name);
      if (!slug) return null;
      const definition = getSkillDefinitionBySlug(slug);
      if (!definition) return null;
      return {
        slug: definition.slug,
        label: definition.label,
        category: definition.category,
        sortOrder: row.sort_order,
      };
    })
    .filter((item): item is ProfileSkillItem => Boolean(item));
}

export async function validateAndPersistSkills(params: {
  supabase: SupabaseLike;
  userId: string;
  skillSlugs: string[];
}) {
  const { skillSlugs, invalidValues } = normalizeIncomingSkillSlugs(params.skillSlugs);
  if (invalidValues.length > 0) {
    throw new Error(`Unknown skill slugs: ${invalidValues.join(", ")}`);
  }
  ensureSkillLimit(skillSlugs);

  const { error: deleteError } = await params.supabase.from("profile_skills").delete().eq("user_id", params.userId);
  if (deleteError) {
    throw new Error(deleteError.message || "Failed to clear profile skills");
  }

  if (skillSlugs.length > 0) {
    const { error: insertError } = await params.supabase.from("profile_skills").insert(
      skillSlugs.map((slug, index) => ({
        user_id: params.userId,
        name: slug,
        sort_order: index,
      }))
    );
    if (insertError) {
      throw new Error(insertError.message || "Failed to save profile skills");
    }
  }

  return skillSlugs;
}
