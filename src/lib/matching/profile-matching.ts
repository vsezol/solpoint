export const ROLE_MATCH_SCORE = 3;
export const INTEREST_MATCH_SCORE = 2;
export const SKILL_MATCH_SCORE = 1;
export const SHARED_EVENT_MATCH_SCORE = 4;

export const INTEREST_MATCH_CAP = 5;
export const SKILL_MATCH_CAP = 5;
export const SHARED_EVENT_MATCH_CAP = 5;

export function countSetOverlap<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 || b.size === 0) return 0;

  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let count = 0;
  for (const value of small) {
    if (large.has(value)) {
      count += 1;
    }
  }
  return count;
}

export function isCompleteProfile(params: {
  about: string | null | undefined;
  countryCode: string | null | undefined;
  role: string | null | undefined;
  skillCount: number;
  interestCount: number;
  experienceCount: number;
}): boolean {
  const about = params.about?.trim() || "";
  return (
    about.length > 0 &&
    Boolean(params.countryCode) &&
    Boolean(params.role) &&
    params.skillCount > 0 &&
    params.interestCount > 0 &&
    params.experienceCount > 0
  );
}

export function computeBestMatchScore(params: {
  hasRoleMatch: boolean;
  interestOverlapCount: number;
  skillOverlapCount: number;
  sharedEventsCount: number;
}): number {
  // Formula:
  // role*3 + min(interestOverlapCount, 5)*2 + min(skillOverlapCount, 5)*1 + min(sharedEventsCount, 5)*4
  const interestScore = Math.min(Math.max(params.interestOverlapCount, 0), INTEREST_MATCH_CAP) * INTEREST_MATCH_SCORE;
  const skillScore = Math.min(Math.max(params.skillOverlapCount, 0), SKILL_MATCH_CAP) * SKILL_MATCH_SCORE;
  const sharedEventsScore =
    Math.min(Math.max(params.sharedEventsCount, 0), SHARED_EVENT_MATCH_CAP) * SHARED_EVENT_MATCH_SCORE;

  return (params.hasRoleMatch ? ROLE_MATCH_SCORE : 0) + interestScore + skillScore + sharedEventsScore;
}
