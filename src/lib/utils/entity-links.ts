import type { ProfileAffiliationType } from "@/types/profile";

const ENTITY_BASE_ROUTES: Record<ProfileAffiliationType, string> = {
  hub: "/hubs",
  community: "/communities",
  project: "/projects",
  workspace: "/workspaces",
  event: "/events",
};

export function getEntityBaseRoute(type: ProfileAffiliationType): string {
  return ENTITY_BASE_ROUTES[type];
}

export function getEntityLink(params: {
  type: ProfileAffiliationType;
  slug?: string | null;
  id: string;
}): string {
  const baseRoute = getEntityBaseRoute(params.type);
  return `${baseRoute}/${params.slug || params.id}`;
}
